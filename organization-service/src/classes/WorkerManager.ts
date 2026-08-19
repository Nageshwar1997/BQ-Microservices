import { JobWorker } from '@beautinique/backend-bullmq';
import { ADMIN_STATUS_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';

import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { AdminTerritory } from '../models/index.js';
import { reassignPendingSellersAwayFrom } from '../utils/index.js';

const WORKER_CONCURRENCY = 5;

export class WorkerManager {
  private worker: JobWorker<'organization-service-queue'> | undefined;

  /* ---------------- START ---------------- */

  public start() {
    this.worker = new JobWorker({
      queueName: 'organization-service-queue',
      connection: envs.redis.bull_mq,
      concurrency: WORKER_CONCURRENCY,
      logger,
      handlers: {
        /* ---------------- ADMIN TERRITORY SYNCED ---------------- */

        // Published by user-service (a) whenever an `Admin`'s territory or
        // status changes, and (b) once per admin in response to
        // `resync-admin-territories` (see `startup.ts`). Always the FULL
        // current snapshot for one admin - upsert the local `AdminTerritory`
        // mirror by `adminUserId`, then react to a `SUSPENDED` transition
        // (Leave vs Suspension design, assignment plan doc section 7) -
        // `ON_LEAVE` keeps ownership as-is (the "covering" model, handled by
        // `authorizeSellerOwnership`/`getSellerQueueController`), only
        // `SUSPENDED` triggers immediate bulk reassignment. No
        // service-to-service HTTP call anywhere in this flow.
        'admin-territory-synced': async (data) => {
          try {
            const { adminUserId, adminName, adminEmail, role, assignedStates, status, priority } =
              data;

            const existing = await AdminTerritory.findOne({ adminUserId: getObjId(adminUserId) })
              .select('status')
              .lean();
            const previousStatus = existing?.status;

            await AdminTerritory.findOneAndUpdate(
              { adminUserId: getObjId(adminUserId) },
              {
                $set: {
                  adminName,
                  adminEmail,
                  role,
                  assignedStates,
                  status,
                  priority,
                  backupAdminUserId: data.backupAdminUserId
                    ? getObjId(data.backupAdminUserId)
                    : null,
                },
              },
              { upsert: true, setDefaultsOnInsert: true },
            );

            logger.info(`✅ Admin territory mirror synced for ${adminUserId} (${status})`);

            if (status === ADMIN_STATUS_MAP.SUSPENDED && previousStatus !== ADMIN_STATUS_MAP.SUSPENDED) {
              const reassignedCount = await reassignPendingSellersAwayFrom(adminUserId);

              logger.info(
                `✅ Reassigned ${String(reassignedCount)} PENDING seller(s) away from suspended admin ${adminUserId}`,
              );
            }
          } catch (error) {
            logger.error({ Error: error, Data: data }, 'Failed to handle admin-territory-synced.');

            throw error;
          }
        },
      },
    });

    logger.info('✅ Worker manager started');
  }

  /* ---------------- RUNNING STATE ---------------- */

  public isRunning() {
    return this.worker?.isRunning() ?? false;
  }

  /* ---------------- STOP ---------------- */

  public async stop() {
    try {
      await this.worker?.close();
      logger.info('✅ Worker manager stopped successfully');
    } catch (error) {
      logger.error(error, '❌ Failed to stop worker manager');
    }
  }
}
