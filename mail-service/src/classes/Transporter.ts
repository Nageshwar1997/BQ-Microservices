import type { IContactAdminNotificationData } from '@beautinique/backend-bullmq';
import { stringifyData } from '@beautinique/shared-utils';
import { BrevoClient } from '@getbrevo/brevo';
import { convert } from 'html-to-text';

import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import {
  getContactAcknowledgementHtmlMessage,
  getContactAdminNotificationHtmlMessage,
  getOtpHtmlMessage,
} from '../utils/index.js';

/**
 * Sends email via Brevo's transactional email API (official SDK) instead of
 * raw SMTP.
 *
 * Render (and Google, independently) were silently dropping every outbound
 * SMTP connection to smtp.gmail.com on both 587 and 465 - `ETIMEDOUT` on
 * every attempt, regardless of IPv4/IPv6 - so no SMTP port worked from this
 * host. An HTTPS API call on port 443 sidesteps that entirely.
 */
export class MailTransporter {
  private client: BrevoClient;
  private isReady = false;

  constructor() {
    this.client = new BrevoClient({ apiKey: envs.mail.apiKey });
  }

  /* ---------------- READY STATE ---------------- */

  public isConnected() {
    return this.isReady;
  }

  /* ---------------- START ---------------- */

  public async start() {
    try {
      if (this.isReady) return;

      // Confirms the API key is valid before accepting traffic - the HTTP
      // equivalent of an SMTP transporter's `verify()`.
      await this.client.account.getAccount();

      this.isReady = true;
      logger.info('✅ Transporter is ready.');
    } catch (error) {
      this.isReady = false;
      logger.error(`❌ Transporter connection failed: ${stringifyData(error)}`);
      throw error;
    }
  }

  /* ---------------- STOP ---------------- */

  public stop() {
    if (!this.isReady) return;

    // Stateless HTTP client - nothing to close, just reflect the new state.
    this.isReady = false;
    logger.warn('🛑 Mail Service Closed');
  }

  /* ---------------- Generic send email ---------------- */

  private async sendMail(options: {
    to: string;
    subject: string;
    htmlOrText: string;
    replyTo?: { email: string; name?: string };
  }) {
    const text = convert(options.htmlOrText, { wordwrap: 130 });

    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { name: 'Beautinique', email: envs.mail.from },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.htmlOrText,
        textContent: text,
        ...(options.replyTo && { replyTo: options.replyTo }),
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

  /* ---------------- Send contact acknowledgement email ---------------- */
  public async sendContactAcknowledgement(
    to: string,
    subject: string,
    data: { ticketId: string; queryType: string },
  ) {
    const html = getContactAcknowledgementHtmlMessage(data);
    await this.sendMail({ to, subject, htmlOrText: html });
  }

  /* ---------------- Send admin contact notification email ---------------- */
  public async sendContactAdminNotification(
    to: string,
    subject: string,
    data: IContactAdminNotificationData,
  ) {
    const html = getContactAdminNotificationHtmlMessage(data);
    // Lets the support agent hit "reply" and land directly in the
    // submitter's inbox, instead of replying to the no-reply sender address.
    await this.sendMail({
      to,
      subject,
      htmlOrText: html,
      replyTo: { email: data.email, name: data.name },
    });
  }
}
