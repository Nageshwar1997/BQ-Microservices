import { JobWorker } from '@beautinique/backend-bullmq';

import { logger, transporter } from '../configs/index.js';
import { envs } from '../envs/index.js';

const WORKER_CONCURRENCY = 5;

export class WorkerManager {
  private worker: JobWorker<'mail-service-queue'> | undefined;

  /* ---------------- START ---------------- */

  public start() {
    this.worker = new JobWorker({
      queueName: 'mail-service-queue',
      connection: envs.redis.bull_mq,
      concurrency: WORKER_CONCURRENCY,
      logger,
      handlers: {
        /* ---------------- SEND OTP ---------------- */

        'send-otp': async (data) => {
          try {
            await transporter.sendOtp(data.email, data.otp);
          } catch (error) {
            logger.error({ Data: data, Error: error }, `Failed to send OTP.`);

            throw error;
          }
        },
        /* ---------------- SEND CONTACT ACKNOWLEDGEMENT ---------------- */

        'send-contact-acknowledgement': async ({ to, subject, data }) => {
          try {
            await transporter.sendContactAcknowledgement({ to, subject, data });
          } catch (error) {
            logger.error(
              { Error: error, To: to, Data: data },
              `Failed to send contact acknowledgement.`,
            );

            throw error;
          }
        },

        /* ---------------- SEND CONTACT ADMIN NOTIFICATION ---------------- */

        'send-contact-admin-notification': async ({ to, subject, data }) => {
          try {
            await transporter.sendContactAdminNotification({ to, subject, data });
          } catch (error) {
            logger.error(
              { Error: error, To: to, Data: data },
              `Failed to send contact admin notification`,
            );

            throw error;
          }
        },

        /* ---------------- SEND ADMIN STATUS-CHANGE NOTIFICATION ---------------- */

        // Published whenever an admin's territory status changes -
        // `user-service`'s `updateAdminStatusController` (self/MASTER
        // toggle) and `AdminLeaveScheduler`'s auto-reactivation sweep both
        // publish this (mirrors `admin-territory-synced`'s sync target).
        'send-admin-status-change-notification': async (data) => {
          try {
            await transporter.sendAdminStatusChangeNotification(data);
          } catch (error) {
            logger.error(
              { Data: data, Error: error },
              'Failed to send admin status-change notification.',
            );

            throw error;
          }
        },

        /* ---------------- SEND SELLER-ASSIGNED NOTIFICATION ---------------- */

        // Published whenever a seller lands in an admin's queue -
        // `organization-service`'s `createSellerController` (initial
        // assignment), `reassignPendingSellersAwayFrom` (4.2, suspension),
        // and `reassignSlaExpiredSellers` (4.3, SLA escalation) all publish
        // this.
        'send-seller-assigned-notification': async (data) => {
          try {
            await transporter.sendSellerAssignedNotification(data);
          } catch (error) {
            logger.error(
              { Data: data, Error: error },
              'Failed to send seller-assigned notification.',
            );

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
