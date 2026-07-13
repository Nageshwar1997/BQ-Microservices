import { stringifyData } from '@beautinique/shared-utils';
import { convert } from 'html-to-text';
import { createTransport } from 'nodemailer';

import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { getOtpHtmlMessage } from '../utils/index.js';

const config = createTransport({
  host: envs.mail.host,
  port: envs.mail.port,
  secure: false,
  auth: { user: envs.mail.user, pass: envs.mail.pass },
  pool: true,
});

export class NodemailerTransporter {
  private transporter: typeof config;
  private isReady = false;

  constructor() {
    this.transporter = config;
  }

  /* ---------------- READY STATE ---------------- */

  public isConnected() {
    return this.isReady;
  }

  /* ---------------- START ---------------- */

  public async start() {
    try {
      if (this.isReady) return;

      await this.transporter.verify();

      this.isReady = true;
      logger.info('✅ Transporter is ready.');;
    } catch (error) {
      this.isReady = false;
      logger.error(`❌ Transporter connection failed: ${stringifyData(error)}`);
      throw error;
    }
  }

  /* ---------------- STOP ---------------- */

  public stop() {
    try {
      if (!this.isReady) return;

      this.transporter.close();

      this.isReady = false;
      logger.warn('🛑 Mail Service Closed');
    } catch (error) {
      logger.error(`❌ Mail Service close failed: ${stringifyData(error)}`);
    }
  }

  /* ---------------- Generic send email ---------------- */

  private async sendMail(options: { to: string; subject: string; htmlOrText: string }) {
    const text = convert(options.htmlOrText, { wordwrap: 130 });

    try {
      await this.transporter.sendMail({
        from: `Beautinique <${envs.mail.from}>`,
        to: options.to,
        subject: options.subject,
        text,
        html: options.htmlOrText,
      });
    } catch (error) {
      logger.error(`❌ Email send failed: ${stringifyData(error)}`);
      throw error;
    }
  }

  /* ---------------- Send OTP email ---------------- */
  public async sendOtp(to: string, otp: string) {
    const html = getOtpHtmlMessage('OTP Verification', otp);
    await this.sendMail({ to, subject: 'Your OTP Code 🔑', htmlOrText: html });
  }
}
