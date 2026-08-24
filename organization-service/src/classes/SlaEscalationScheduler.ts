import { logger } from '../configs/index.js';
import { reassignSlaExpiredSellers } from '../utils/index.js';

const SWEEP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Auto-escalates any `PENDING` seller that's been sitting under an
 * `ON_LEAVE` admin too long (assignment plan doc, section 7.1's SLA
 * safety-net - task 4.3), on a periodic sweep rather than a delayed BullMQ
 * job - mirrors user-service's `AdminLeaveScheduler` for the same reason: a
 * sweep just re-checks current state every run, so it's idempotent and
 * self-healing even if the admin returns from leave before the next sweep
 * (nothing left to escalate) or the service restarted (the first sweep on
 * boot catches anything that went stale while it was down). A single
 * delayed job per seller would need to be tracked and cancelled on every
 * early return instead.
 */
export class SlaEscalationScheduler {
  private timer: NodeJS.Timeout | undefined;

  /* ---------------- START ---------------- */

  public start() {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.sweep();
    }, SWEEP_INTERVAL_MS);

    void this.sweep();

    logger.info('✅ SLA escalation scheduler started');
  }

  /* ---------------- RUNNING STATE ---------------- */

  public isRunning() {
    return this.timer !== undefined;
  }

  /* ---------------- STOP ---------------- */

  // `async` (despite no `await`) to match `IShutdownTask.task`'s
  // `() => Promise<void>` shape.
  // eslint-disable-next-line @typescript-eslint/require-await
  public async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    logger.info('✅ SLA escalation scheduler stopped');
  }

  /* ---------------- SWEEP ---------------- */

  private async sweep() {
    try {
      const count = await reassignSlaExpiredSellers();

      if (count > 0) {
        logger.info(`✅ SLA-escalated ${String(count)} seller(s) away from on-leave admins`);
      }
    } catch (error) {
      logger.error(error, '❌ SLA escalation sweep failed');
    }
  }
}
