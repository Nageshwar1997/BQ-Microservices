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
});

class Transporter {
  private transporter: typeof config;
  private isReady = false;

  constructor() {
    this.transporter = config;
  }

  /* ---------------- CONNECT ---------------- */

  public async connect() {
    try {
      if (this.isReady) return;

      await this.transporter.verify();

      this.isReady = true;
      logger.info('📧 Mail Service Connected');
    } catch (err) {
      this.isReady = false;
      logger.error('❌ Mail Service connection failed:', err);
      throw err;
    }
  }

  /* ---------------- CLOSE ---------------- */

  public disconnect() {
    try {
      if (!this.isReady) return;

      // 🔥 close only works if pooling enabled
      if (typeof this.transporter.close === 'function') {
        this.transporter.close();
      }

      this.isReady = false;
      logger.warn('🛑 Mail Service Closed');
    } catch (err) {
      logger.error('❌ Mail Service close failed:', err);
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
    } catch (err) {
      logger.error('❌ Email send failed:', err);
      throw err;
    }
  }

  /* ---------------- Send OTP email ---------------- */
  public async sendOtp(to: string, otp: string) {
    const html = getOtpHtmlMessage('OTP Verification', otp);
    await this.sendMail({ to, subject: 'Your OTP Code 🔑', htmlOrText: html });
  }
}

export const transporter = new Transporter();
