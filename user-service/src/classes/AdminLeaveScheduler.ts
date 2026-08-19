import {
  ADMIN_STATUS_MAP,
  TERRITORY_STATUS_CHANGE_REASON_MAP,
} from '@beautinique/backend-constants';

import { logger } from '../configs/index.js';
import { Admin } from '../models/index.js';
import { publishAdminTerritorySync } from '../utils/index.js';

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Auto-reverts any `ON_LEAVE` admin whose `leaveUntil` has passed back to
 * `ACTIVE`, on a periodic sweep - not a delayed BullMQ job. A sweep is
 * idempotent and self-healing even if the leave was ended early (manual
 * status update just short-circuits it - nothing left to sweep) or the
 * service restarted mid-leave (the first sweep on boot catches anything
 * that expired while it was down); a single delayed job per leave would
 * need to be tracked and cancelled on every early return instead.
 */
export class AdminLeaveScheduler {
  private timer: NodeJS.Timeout | undefined;

  /* ---------------- START ---------------- */

  public start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.sweep();
    }, SWEEP_INTERVAL_MS);

    void this.sweep();

    logger.info('✅ Admin leave scheduler started');
  }

  /* ---------------- RUNNING STATE ---------------- */

  public isRunning() {
    return this.timer !== undefined;
  }

  /* ---------------- STOP ---------------- */

  // `async` (despite no `await`) to match `IShutdownTask.task`'s
  // `() => Promise<void>` shape, same as `WorkerManager.stop`.
  // eslint-disable-next-line @typescript-eslint/require-await
  public async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    logger.info('✅ Admin leave scheduler stopped');
  }

  /* ---------------- SWEEP ---------------- */

  private async sweep() {
    try {
      const expiredAdmins = await Admin.find({
        status: ADMIN_STATUS_MAP.ON_LEAVE,
        leaveUntil: { $lte: new Date() },
      });

      for (const admin of expiredAdmins) {
        const changedAt = new Date();

        admin.status = ADMIN_STATUS_MAP.ACTIVE;
        admin.statusReason = undefined;
        admin.leaveUntil = null;
        admin.statusUpdatedAt = changedAt;

        admin.statusHistory.push({
          status: ADMIN_STATUS_MAP.ACTIVE,
          reason: TERRITORY_STATUS_CHANGE_REASON_MAP.REACTIVATED,
          note: 'Leave period ended - auto-reactivated',
          changedAt,
          // System-triggered, not a human request - attributed to the
          // admin's own user id rather than left unset (the field is required).
          changedBy: admin.user,
        });

        const updatedAdmin = await admin.save();

        await publishAdminTerritorySync(updatedAdmin);
      }

      if (expiredAdmins.length > 0) {
        logger.info(`✅ Auto-reactivated ${String(expiredAdmins.length)} admin(s) - leave ended`);
      }
    } catch (error) {
      logger.error(error, '❌ Admin leave sweep failed');
    }
  }
}
