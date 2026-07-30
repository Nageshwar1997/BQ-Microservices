import { JobWorker } from '@beautinique/backend-bullmq';
import { stringifyData } from '@beautinique/shared-utils';

import { logger, transporter } from '../configs/index.js';
import { envs } from '../envs/index.js';

const WORKER_CONCURRENCY = 5;

export class WorkerManager {
  private worker: JobWorker<'mail-queue'> | undefined;

  /* ---------------- START ---------------- */

  public start() {
    this.worker = new JobWorker({
      queueName: 'mail-queue',
      connection: envs.redis.bull_mq,
      concurrency: WORKER_CONCURRENCY,
      logger,
      handlers: {
        /* ---------------- SEND OTP ---------------- */

        'send-otp': async (data) => {
          try {
            await transporter.sendOtp(data.email, data.otp);
          } catch (error) {
            logger.error(
              `Failed to send OTP. Error:${stringifyData(error)}. Data:${stringifyData(data)}`,
            );

            throw error;
          }
        },
        'send-contact-acknowledgement': async (data) => {
          try {
            await transporter.sendContactAcknowledgement(data.to, data.subject);
          } catch (error) {
            logger.error(
              `Failed to send OTP. Error:${stringifyData(error)}. Data:${stringifyData(data)}`,
            );

            throw error;
          }
        },
        'send-contact-admin-notification': async (data) => {
          try {
            await transporter.sendContactAdminNotification(data.to, data.subject);
          } catch (error) {
            logger.error(
              `Failed to send OTP. Error:${stringifyData(error)}. Data:${stringifyData(data)}`,
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
