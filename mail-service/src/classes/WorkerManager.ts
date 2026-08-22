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

        // eslint-disable-next-line @typescript-eslint/require-await
        'send-admin-status-change-notification': async ({ to: _, subject: __, data }) => {
          // eslint-disable-next-line no-console
          console.log('send-admin-status-change-notification Data', data);
        },
        // eslint-disable-next-line @typescript-eslint/require-await
        'send-seller-assigned-notification': async ({ to: _, subject: __, data }) => {
          // eslint-disable-next-line no-console
          console.log('send-seller-assigned-notification Data', data);
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
