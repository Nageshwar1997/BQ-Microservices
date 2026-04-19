import { transporterConfig } from '@/configs';
import { logger } from '@/configs';
import { envs } from '@/envs';
import { getOtpHtmlMessage } from '@/utils';
import { convert } from 'html-to-text';

export class MailService {
  private transporter: typeof transporterConfig;
  private isReady = false;

  constructor() {
    this.transporter = transporterConfig;
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

  public async close() {
    try {
      if (!this.transporter) return;

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

  /* ---------------- OTP email ---------------- */
  public async sendOtp(to: string, otp: string) {
    const html = getOtpHtmlMessage('OTP Verification', otp);
    await this.sendMail({ to, subject: 'Your OTP Code 🔑', htmlOrText: html });
  }
}
