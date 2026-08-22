import { JobWorker } from '@beautinique/backend-bullmq';

import { logger, redisCacheManager } from '../configs/index.js';
import { envs } from '../envs/index.js';

const WORKER_CONCURRENCY = 5;

export class WorkerManager {
  private worker: JobWorker<'product-service-queue'> | undefined;

  /* ---------------- START ---------------- */

  public start() {
    this.worker = new JobWorker({
      queueName: 'product-service-queue',
      connection: envs.redis.bull_mq,
      concurrency: WORKER_CONCURRENCY,
      logger,
      handlers: {
        /* ---------------- SELLER ADMIN ASSIGNED ---------------- */

        // Published by organization-service after it resolves+stamps
        // `Seller.assignedAdmin` - on both the initial assignment and any
        // later reassignment (e.g. away from a SUSPENDED admin). Keeps this
        // service's local `assignment:user-admin:<USER_ID>` cache in sync
        // for product-review ownership checks
        // (`authorizeProductOwnership.middleware.ts`) without duplicating
        // organization-service's state->admin resolution logic, or calling
        // it over HTTP (assignment plan doc: service-to-service is BullMQ
        // jobs only, never peer HTTP).
        'seller-admin-assigned': async (data) => {
          try {
            await redisCacheManager.assignment.setUserAdmin(data.userId, {
              assignedAdminId: data.assignedAdminId,
              sellerId: data.sellerId,
            });

            logger.info(
              `✅ Cached admin assignment for user ${data.userId} -> admin ${data.assignedAdminId}`,
            );
          } catch (error) {
            logger.error({ Error: error, Data: data }, 'Failed to handle seller-admin-assigned.');

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
