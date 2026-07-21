import { promises as dns } from 'node:dns';
import net from 'node:net';

import { stringifyData } from '@beautinique/shared-utils';
import { convert } from 'html-to-text';
import { createTransport, type Transporter } from 'nodemailer';

import { logger } from '../configs/index.js';
import { envs } from '../envs/index.js';
import { getOtpHtmlMessage } from '../utils/index.js';

/**
 * Resolves `host` to a literal IPv4 address.
 *
 * Nodemailer resolves both A and AAAA records itself and then picks one at
 * random to connect to (`lib/shared/index.js`'s `formatDNSValue`) -
 * `dns.setDefaultResultOrder('ipv4first')` has no effect on this, since
 * that path never calls `dns.lookup()`. On a host with no outbound IPv6
 * route (e.g. Render), a random IPv6 pick fails with ENETUNREACH. Handing
 * Nodemailer an already-resolved IPv4 literal makes its own `net.isIP(host)`
 * check skip that DNS/family-selection logic entirely, for every
 * connection this transport ever opens.
 */
const resolveIpv4Host = async (host: string): Promise<string> => {
  if (net.isIP(host)) return host;

  const [address] = await dns.resolve4(host);

  if (!address) {
    throw new Error(`Could not resolve an IPv4 address for MAIL_HOST "${host}".`);
  }

  return address;
};

export class NodemailerTransporter {
  private transporter: Transporter | undefined;
  private isReady = false;

  /* ---------------- READY STATE ---------------- */

  public isConnected() {
    return this.isReady;
  }

  /* ---------------- START ---------------- */

  public async start() {
    try {
      if (this.isReady) return;

      if (!this.transporter) {
        const host = await resolveIpv4Host(envs.mail.host);

        this.transporter = createTransport({
          host,
          port: envs.mail.port,
          secure: false,
          auth: { user: envs.mail.user, pass: envs.mail.pass },
          pool: true,
          // `host` above is now a literal IP, so Nodemailer can't derive
          // the TLS server name from it - set it explicitly so SNI/cert
          // hostname validation still checks against the real hostname.
          tls: { servername: envs.mail.host },
        });
      }

      await this.transporter.verify();

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
    try {
      if (!this.isReady) return;

      this.transporter?.close();

      this.isReady = false;
      logger.warn('🛑 Mail Service Closed');
    } catch (error) {
      logger.error(`❌ Mail Service close failed: ${stringifyData(error)}`);
    }
  }

  /* ---------------- Generic send email ---------------- */

  private async sendMail(options: { to: string; subject: string; htmlOrText: string }) {
    if (!this.transporter) {
      throw new Error('Mail transporter is not started.');
    }

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
