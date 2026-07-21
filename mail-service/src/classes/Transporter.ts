import { stringifyData } from '@beautinique/shared-utils';
import { convert } from 'html-to-text';

import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { getOtpHtmlMessage } from '../utils/index.js';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

interface IBrevoErrorBody {
  code?: string;
  message?: string;
}

/**
 * Sends email via Brevo's transactional email REST API instead of raw SMTP.
 *
 * Render (and Google, independently) were silently dropping every outbound
 * SMTP connection to smtp.gmail.com on both 587 and 465 - `ETIMEDOUT` on
 * every attempt, regardless of IPv4/IPv6 - so no SMTP port worked from this
 * host. An HTTPS API call on port 443 sidesteps that entirely.
 */
export class MailTransporter {
  private isReady = false;

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
      const response = await fetch(`${BREVO_API_BASE}/account`, {
        method: 'GET',
        headers: { 'api-key': envs.mail.apiKey, Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Brevo account check failed with status ${String(response.status)}`);
      }

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

  private async sendMail(options: { to: string; subject: string; htmlOrText: string }) {
    const text = convert(options.htmlOrText, { wordwrap: 130 });

    try {
      const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
        method: 'POST',
        headers: {
          'api-key': envs.mail.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Beautinique', email: envs.mail.from },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.htmlOrText,
          textContent: text,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as IBrevoErrorBody | null;

        throw new Error(
          `Brevo send failed (${String(response.status)}): ${body?.message ?? response.statusText}`,
        );
      }
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
