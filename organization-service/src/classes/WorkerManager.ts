import { JobWorker } from '@beautinique/backend-bullmq';

import { logger, redisCacheManager } from '../configs/index.js';
import { envs } from '../envs/index.js';

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
        /* ---------------- TERRITORY STATUS CHANGED ---------------- */

        // Published by user-service's `updateAdminStatusController` /
        // `AdminLeaveScheduler` whenever an `Admin`'s status changes.
        // Just invalidates this state's cached pick - forces the next
        // `resolveStateAdmin` call to re-resolve from user-service instead
        // of serving a stale one. Reassigning that state's in-flight
        // `PENDING` sellers away from a now-unavailable admin is Phase 4
        // work, not this handler's.
        'territory-status-changed': async (data) => {
          try {
            const { state, adminId, newStatus, reason } = data;

            await redisCacheManager.territory.invalidateStateAdmin(state);

            logger.info(
              `✅ Territory cache invalidated for ${state} (admin ${adminId} -> ${newStatus}, ${reason})`,
            );
          } catch (error) {
            logger.error({ Error: error, Data: data }, 'Failed to handle territory-status-changed.');

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
