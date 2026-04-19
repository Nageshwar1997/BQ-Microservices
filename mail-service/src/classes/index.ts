import { transporterConfig } from '@/configs';
import { logger } from '@/configs';

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
}
