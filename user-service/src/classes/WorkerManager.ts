import { JobWorker } from '@beautinique/backend-bullmq';
import { USER_ROLE_MAP } from '@beautinique/backend-constants';
import { getObjId } from '@beautinique/backend-mongoose';

import { logger, redisCacheManager } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { Admin, User } from '../models/index.js';
import { getMinimalUser, publishAdminTerritorySync } from '../utils/index.js';

const WORKER_CONCURRENCY = 5;

export class WorkerManager {
  private worker: JobWorker<'user-service-queue'> | undefined;

  /* ---------------- START ---------------- */

  public start() {
    this.worker = new JobWorker({
      queueName: 'user-service-queue',
      connection: envs.redis.bull_mq,
      concurrency: WORKER_CONCURRENCY,
      logger,
      handlers: {
        /* ---------------- UPDATE ROLE ---------------- */

        // e.g. organization-service's `updateSellerApprovalStatusController`,
        // once an admin approves a pending seller application.
        'update-role': async (data) => {
          try {
            const { userId, role } = data;

            const user = await User.findById(getObjId(userId));

            if (!user) {
              logger.warn(`User not found for role update, userId: ${userId}`);
              return;
            }

            if (user.role === role) {
              logger.warn(`User already has role ${role}, userId: ${userId}`);
              return;
            }

            user.role = role;

            const updatedUser = await user.save();

            await redisCacheManager.user.setUser(getMinimalUser(updatedUser));

            // Auto-provision an empty `Admin` the first time a user
            // becomes territory-capable - `assignAdminTerritoryController` /
            // `updateAdminStatusController` can then assume one always
            // exists instead of special-casing "not created yet". Demoting
            // a role away from these does NOT clean the profile up (see
            // task 7.1 - blocking demotion while an admin still owns live
            // assignments).
            if (
              role === USER_ROLE_MAP.ADMIN ||
              role === USER_ROLE_MAP.SUPER_ADMIN ||
              role === USER_ROLE_MAP.MASTER
            ) {
              const adminProfile = await Admin.findOneAndUpdate(
                { user: updatedUser._id },
                { $setOnInsert: { user: updatedUser._id } },
                { upsert: true, new: true, setDefaultsOnInsert: true },
              );

              // No-op for MASTER inside `publishAdminTerritorySync` itself -
              // still worth calling uniformly rather than re-checking role here.
              await publishAdminTerritorySync(adminProfile);
            }
          } catch (error) {
            logger.error({ Error: error, Data: data }, 'Failed to update user role.');

            throw error;
          }
        },

        /* ---------------- RESYNC ADMIN TERRITORIES ---------------- */

        // Requested by organization-service (typically once, at startup) to
        // rebuild its local `AdminTerritory` mirror from scratch - covers
        // cold-start/a fresh or wiped mirror, since BullMQ doesn't retain
        // already-processed jobs to replay. Re-publishes the full current
        // snapshot for every admin-capable `Admin` document.
        'resync-admin-territories': async () => {
          try {
            const admins = await Admin.find().lean();

            await Promise.all(admins.map((admin) => publishAdminTerritorySync(admin)));

            logger.info(`✅ Re-synced ${String(admins.length)} admin territor(y/ies)`);
          } catch (error) {
            logger.error(error, 'Failed to resync admin territories.');

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
