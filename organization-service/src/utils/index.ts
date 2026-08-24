import {
  ADMIN_STATUS_MAP,
  SELLER_APPROVAL_STATUS_MAP,
  TERRITORY_ASSIGNMENT_REASON_MAP,
  USER_ROLE_MAP,
} from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';
import type { TStateOrUT } from '@beautinique/backend-types';

import { jobProducer, logger, redisCacheManager } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { AdminTerritory, Seller } from '../models/index.js';
import type { IResolvedAdmin, TAdminTerritory, TId } from '../types/index.js';

/**
 * Ranks `candidates` by "who's least busy right now", then `priority` as a
 * tie-break - `currentPendingLoad` isn't mirrored from user-service (see
 * `adminTerritory.schema.ts`), it's computed live from this service's own
 * `Seller` data, which is the actual source of truth for "how many PENDING
 * sellers does this admin currently own".
 */
const pickLeastLoaded = async (
  candidates: Pick<TAdminTerritory, 'adminUserId' | 'adminName' | 'adminEmail' | 'priority'>[],
) => {
  if (candidates.length === 0) {
    return null;
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const loads = await Seller.aggregate<{ _id: TId; count: number }>([
    {
      $match: {
        approvalStatus: SELLER_APPROVAL_STATUS_MAP.PENDING,
        assignedAdmin: { $in: candidates.map((candidate) => candidate.adminUserId) },
      },
    },
    { $group: { _id: '$assignedAdmin', count: { $sum: 1 } } },
  ]);

  const loadByAdminId = new Map(loads.map((load) => [load._id.toString(), load.count]));

  return [...candidates].sort((left, right) => {
    const loadDiff =
      (loadByAdminId.get(left.adminUserId.toString()) ?? 0) -
      (loadByAdminId.get(right.adminUserId.toString()) ?? 0);

    return loadDiff !== 0 ? loadDiff : left.priority - right.priority;
  })[0];
};

/**
 * State -> admin resolution (assignment plan doc, section 6) - purely local
 * (no service-to-service HTTP call, no Redis cache-aside needed - it's
 * already a local Mongo read). Order: this state's `ACTIVE` `ADMIN`s
 * (load-balanced) -> their configured backups (if `ACTIVE`) -> the global
 * `SUPER_ADMIN` pool (load-balanced) -> `null` if nobody is available.
 *
 * `AdminTerritory` is a local mirror kept in sync by `WorkerManager`
 * consuming `admin-territory-synced` jobs from user-service - never queried
 * remotely here.
 */
export const resolveStateAdmin = async (state: TStateOrUT): Promise<IResolvedAdmin | null> => {
  /* ---------------- 1. THIS STATE'S ACTIVE ADMINS ---------------- */

  const stateAdmins = await AdminTerritory.find({
    assignedStates: state,
    role: USER_ROLE_MAP.ADMIN,
    status: ADMIN_STATUS_MAP.ACTIVE,
  }).lean();

  const statePick = await pickLeastLoaded(stateAdmins);

  if (statePick) {
    return {
      adminUserId: statePick.adminUserId.toString(),
      adminName: statePick.adminName,
      adminEmail: statePick.adminEmail,
      reason: TERRITORY_ASSIGNMENT_REASON_MAP.STATE_MATCH,
    };
  }

  /* ---------------- 2. THEIR CONFIGURED BACKUPS ---------------- */

  const allStateAdmins = await AdminTerritory.find({
    assignedStates: state,
    role: USER_ROLE_MAP.ADMIN,
  })
    .select('backupAdminUserId')
    .lean();

  const backupIds = [
    ...new Set(
      allStateAdmins
        .map((admin) => admin.backupAdminUserId?.toString())
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (backupIds.length > 0) {
    const activeBackups = await AdminTerritory.find({
      adminUserId: { $in: backupIds },
      status: ADMIN_STATUS_MAP.ACTIVE,
    }).lean();

    const backupPick = await pickLeastLoaded(activeBackups);

    if (backupPick) {
      return {
        adminUserId: backupPick.adminUserId.toString(),
        adminName: backupPick.adminName,
        adminEmail: backupPick.adminEmail,
        reason: TERRITORY_ASSIGNMENT_REASON_MAP.BACKUP_COVERAGE,
      };
    }
  }

  /* ---------------- 3. SUPER_ADMIN POOL (global safety net) ---------------- */

  const superAdmins = await AdminTerritory.find({
    role: USER_ROLE_MAP.SUPER_ADMIN,
    status: ADMIN_STATUS_MAP.ACTIVE,
  }).lean();

  const superAdminPick = await pickLeastLoaded(superAdmins);

  if (superAdminPick) {
    return {
      adminUserId: superAdminPick.adminUserId.toString(),
      adminName: superAdminPick.adminName,
      adminEmail: superAdminPick.adminEmail,
      reason: TERRITORY_ASSIGNMENT_REASON_MAP.SUPER_ADMIN_POOL,
    };
  }

  /* ---------------- 4. NOBODY AVAILABLE ---------------- */

  return null;
};

/**
 * Bulk-reassigns every `PENDING` seller currently owned by `adminUserId` to
 * whoever `resolveStateAdmin` picks next for their state - called only on a
 * `SUSPENDED` transition (assignment plan doc, section 7.2). `ON_LEAVE`
 * deliberately does NOT call this - ownership stays put there (the
 * "covering" model - see `authorizeSellerOwnership` / `getSellerQueueController`),
 * only `SUSPENDED` triggers immediate reassignment.
 *
 * By the time this runs, `WorkerManager` has already upserted `adminUserId`'s
 * `AdminTerritory` row to `SUSPENDED`, so `resolveStateAdmin`'s `ACTIVE`
 * filter naturally excludes them - no special-casing needed here.
 *
 * Per-seller failures are logged and skipped rather than aborting the whole
 * batch - one bad resolve/save shouldn't leave the rest of the admin's
 * queue stuck with a suspended owner.
 */
export const reassignPendingSellersAwayFrom = async (adminUserId: string): Promise<number> => {
  const affectedSellers = await Seller.find({
    assignedAdmin: getObjId(adminUserId),
    approvalStatus: SELLER_APPROVAL_STATUS_MAP.PENDING,
  });

  let reassignedCount = 0;

  for (const seller of affectedSellers) {
    try {
      const resolved = await resolveStateAdmin(seller.address.state);

      if (!resolved) {
        logger.warn(
          `⚠️ No admin available to reassign seller ${seller._id.toString()} away from suspended admin ${adminUserId} - needs manual assignment`,
        );
        continue;
      }

      seller.assignedAdmin = getObjId(resolved.adminUserId);
      seller.assignedAdminHistory.push({
        admin: getObjId(resolved.adminUserId),
        assignedAt: new Date(),
        reason: TERRITORY_ASSIGNMENT_REASON_MAP.ADMIN_SUSPENDED,
      });
      seller.assignedViaSuperAdminPool =
        resolved.reason === TERRITORY_ASSIGNMENT_REASON_MAP.SUPER_ADMIN_POOL;

      await seller.save();

      reassignedCount += 1;

      await jobProducer.addJob('product-service-queue', 'seller-admin-assigned', {
        userId: seller.user.toString(),
        sellerId: seller._id.toString(),
        assignedAdminId: resolved.adminUserId,
        state: seller.address.state,
        reason: TERRITORY_ASSIGNMENT_REASON_MAP.ADMIN_SUSPENDED,
      });

      await jobProducer.addJob('mail-service-queue', 'send-seller-assigned-notification', {
        to: resolved.adminEmail,
        subject: `Seller reassigned to you - ${seller.businessDetails.name}`,
        data: {
          sellerBusinessName: seller.businessDetails.name,
          state: seller.address.state,
        },
      });
    } catch (error) {
      logger.error(
        error,
        `❌ Failed to reassign seller ${seller._id.toString()} away from suspended admin ${adminUserId}`,
      );
    }
  }

  return reassignedCount;
};

// How long a `PENDING` item may sit under an `ON_LEAVE` admin before the SLA
// sweep escalates it away - assignment plan doc, section 7.1's "safety net"
// (task 4.3). A plain constant, not an env var - "configurable" there just
// means "a one-line edit", same weight as `SWEEP_INTERVAL_MS` below.
const SLA_ESCALATION_DAYS = 3;

/**
 * Auto-escalates any `PENDING` seller that's been sitting under an
 * `ON_LEAVE` admin for more than `SLA_ESCALATION_DAYS` - the "covering"
 * model (section 7.1) leaves ownership in place indefinitely by design, but
 * without this, a backlog could sit stuck forever if nobody covering it
 * ever acts. Called by `SlaEscalationScheduler`'s periodic sweep, not a
 * delayed job - same reasoning as `AdminLeaveScheduler` in user-service
 * (idempotent/self-healing, no per-item timer to track or cancel).
 *
 * The clock is measured from `assignedAdminHistory[last].assignedAt` (how
 * long the *current* admin has had it), not the seller's original
 * `createdAt` - a seller that was just reassigned to someone who
 * immediately went on leave shouldn't instantly qualify just because the
 * application itself is old.
 *
 * `resolveStateAdmin` already excludes `ON_LEAVE` admins from the
 * state-match step, so re-resolving naturally routes to the same backup
 * (or pool) already "covering" this item - no special-casing needed here,
 * same as `reassignPendingSellersAwayFrom` relies on for `SUSPENDED`.
 */
export const reassignSlaExpiredSellers = async (): Promise<number> => {
  const onLeaveAdmins = await AdminTerritory.find({ status: ADMIN_STATUS_MAP.ON_LEAVE })
    .select('adminUserId')
    .lean();

  if (onLeaveAdmins.length === 0) {
    return 0;
  }

  const cutoff = new Date(Date.now() - SLA_ESCALATION_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await Seller.find({
    assignedAdmin: { $in: onLeaveAdmins.map((admin) => admin.adminUserId) },
    approvalStatus: SELLER_APPROVAL_STATUS_MAP.PENDING,
  });

  let reassignedCount = 0;

  for (const seller of candidates) {
    const lastAssignedAt = seller.assignedAdminHistory.at(-1)?.assignedAt ?? seller.createdAt;

    if (lastAssignedAt > cutoff) {
      continue; // hasn't been sitting long enough yet
    }

    try {
      const resolved = await resolveStateAdmin(seller.address.state);

      if (!resolved) {
        logger.warn(
          `⚠️ No admin available to SLA-escalate seller ${seller._id.toString()} away from on-leave admin - needs manual assignment`,
        );
        continue;
      }

      seller.assignedAdmin = getObjId(resolved.adminUserId);
      seller.assignedAdminHistory.push({
        admin: getObjId(resolved.adminUserId),
        assignedAt: new Date(),
        reason: TERRITORY_ASSIGNMENT_REASON_MAP.SLA_TIMEOUT,
      });
      seller.assignedViaSuperAdminPool =
        resolved.reason === TERRITORY_ASSIGNMENT_REASON_MAP.SUPER_ADMIN_POOL;

      await seller.save();

      reassignedCount += 1;

      await jobProducer.addJob('product-service-queue', 'seller-admin-assigned', {
        userId: seller.user.toString(),
        sellerId: seller._id.toString(),
        assignedAdminId: resolved.adminUserId,
        state: seller.address.state,
        reason: TERRITORY_ASSIGNMENT_REASON_MAP.SLA_TIMEOUT,
      });

      await jobProducer.addJob('mail-service-queue', 'send-seller-assigned-notification', {
        to: resolved.adminEmail,
        subject: `Seller reassigned to you - ${seller.businessDetails.name}`,
        data: {
          sellerBusinessName: seller.businessDetails.name,
          state: seller.address.state,
        },
      });
    } catch (error) {
      logger.error(error, `❌ Failed to SLA-escalate seller ${seller._id.toString()}`);
    }
  }

  return reassignedCount;
};

interface IOlaGeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface IOlaGeocodeResponse {
  status: string;
  geocodingResults: { address_components: IOlaGeocodeAddressComponent[] }[];
}

const OLA_MAPS_BASE_URL = 'https://api.olamaps.io';

// Same loose two-way substring match the frontend's Places Autocomplete uses
// (`olaMaps.util.ts`'s `matchState`) - Ola's `administrative_area_level_1.long_name`
// doesn't always match `STATES_AND_UTS` verbatim (e.g. "Delhi" vs our "Delhi
// (National Capital Territory of Delhi)").
const matchesClaimedState = (olaStateName: string, claimedState: TStateOrUT): boolean => {
  const needle = olaStateName.toLowerCase();
  const haystack = claimedState.toLowerCase();
  return haystack.includes(needle) || needle.includes(haystack);
};

let cachedOlaMapsToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * Ola Maps' geocode REST API is domain-restricted when called with a plain
 * `api_key` (that's meant for browser use, see `BQ-Client`'s
 * `olaMaps.util.ts`, whose requests carry a real `Origin` header) - a
 * server has no `Origin` at all, which Ola's API treats as just another
 * (disallowed) domain. Confirmed live while migrating off Google Maps:
 * `api_key` from here got `"Domain  is not allowed."`, the OAuth2
 * client-credentials flow below didn't. Token is cached in-memory and
 * refreshed a minute before its JWT `exp` - Ola's tokens were observed
 * long-lived (~1 year) live, but that's never assumed here, only the real
 * expiry is trusted.
 */
const getOlaMapsAccessToken = async (): Promise<string | null> => {
  if (!envs.ola_maps_client_id || !envs.ola_maps_client_secret) return null;

  if (cachedOlaMapsToken && cachedOlaMapsToken.expiresAt - 60_000 > Date.now()) {
    return cachedOlaMapsToken.accessToken;
  }

  try {
    const response = await fetch(`${OLA_MAPS_BASE_URL}/auth/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'openid olamaps',
        client_id: envs.ola_maps_client_id,
        client_secret: envs.ola_maps_client_secret,
      }),
    });

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) return null;

    // JWTs are `header.payload.signature`, base64url-encoded - decoding the
    // payload locally to read `exp` avoids a second network round-trip.
    const payload = JSON.parse(
      Buffer.from(data.access_token.split('.')[1] ?? '', 'base64url').toString('utf-8'),
    ) as { exp?: number };
    const expiresAt =
      typeof payload.exp === 'number' ? payload.exp * 1000 : Date.now() + 5 * 60_000;

    cachedOlaMapsToken = { accessToken: data.access_token, expiresAt };
    return cachedOlaMapsToken.accessToken;
  } catch (error) {
    logger.warn(error, '⚠️ Failed to fetch an Ola Maps access token');
    return null;
  }
};

/**
 * The actual Ola Maps geocode round-trip, isolated from the caching wrapper
 * below - returns Ola's raw `administrative_area_level_1.long_name` (or
 * `null` if it can't be determined), never the boolean match result, since
 * a pincode's resolved state doesn't depend on what any particular caller
 * *claims* - that's the part that's safe to cache and reuse across sellers.
 */
const fetchStateNameForPincode = async (pincode: string): Promise<string | null> => {
  const accessToken = await getOlaMapsAccessToken();
  if (!accessToken) return null;

  const url = new URL(`${OLA_MAPS_BASE_URL}/places/v1/geocode`);
  url.searchParams.set('address', `${pincode}, India`);

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = (await response.json()) as IOlaGeocodeResponse;

  if (data.status !== 'ok' || !data.geocodingResults[0]) return null;

  const stateComponent = data.geocodingResults[0].address_components.find((component) =>
    component.types.includes('administrative_area_level_1'),
  );

  return stateComponent?.long_name ?? null;
};

/**
 * Cache-aside in front of `fetchStateNameForPincode` (task 6.4) - a
 * pincode's state never changes, so once resolved it's reused for every
 * future seller with that pincode instead of re-hitting Ola Maps. Cuts API
 * calls (and matters for the free-tier quota, assignment plan doc section
 * 5.4) without changing behavior - a cache miss/Redis outage just falls
 * through to the same live geocode call as before.
 */
const resolveStateNameForPincode = async (pincode: string): Promise<string | null> => {
  const cached = await redisCacheManager.geocode.getStateForPincode(pincode);
  if (cached) return cached;

  const stateName = await fetchStateNameForPincode(pincode);
  if (stateName) {
    await redisCacheManager.geocode.setStateForPincode(pincode, stateName);
  }

  return stateName;
};

/**
 * Best-effort, non-blocking cross-check: does the submitted pincode actually
 * fall in the submitted state? Server-side, so a client can't just POST a
 * mismatched state directly (bypassing the frontend's Places-derived,
 * read-only state field). Returns `true` when it can't tell either way (no
 * credentials configured, API down/quota-exceeded, unrecognized pincode) -
 * "unable to verify" must never read as "confirmed mismatch" (assignment
 * plan doc, section 5.5 - graceful degrade, this is a fraud-signal layer on
 * top of `resolveStateAdmin`, never a gate on it).
 */
export const verifyStateFromPincode = async (
  pincode: string,
  claimedState: TStateOrUT,
): Promise<boolean> => {
  try {
    const stateName = await resolveStateNameForPincode(pincode);
    if (!stateName) return true;

    return matchesClaimedState(stateName, claimedState);
  } catch (error) {
    logger.warn(error, `⚠️ Failed to verify pincode ${pincode} against state ${claimedState}`);
    return true;
  }
};
