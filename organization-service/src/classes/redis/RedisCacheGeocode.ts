import { RedisCacheHelper } from './RedisCacheHelper.js';

// A pincode's state never changes in the real world, so this is cached far
// longer than the other caches in this service (e.g. `RedisCacheSeller`'s
// 1-day draft TTL) - 90 days, not "forever", just so a transient bad
// geocode result (a fraud-edge-case, quota hiccup, etc.) has a natural
// self-heal path instead of being stuck wrong permanently. Task 6.4 - cuts
// repeat Ola Maps geocode calls for the same pincode, which matters both
// for latency and for staying inside the free-tier quota (assignment plan
// doc, section 5.4).
const PINCODE_STATE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export class RedisCacheGeocode extends RedisCacheHelper {
  private readonly PINCODE_STATE_KEY = 'bq:geocode:pincode-state';

  private getPincodeStateKey(pincode: string) {
    return `${this.PINCODE_STATE_KEY}:${pincode}`;
  }

  public async getStateForPincode(pincode: string) {
    return this.getData<string>(this.getPincodeStateKey(pincode));
  }

  public async setStateForPincode(pincode: string, state: string) {
    await this.setData(this.getPincodeStateKey(pincode), PINCODE_STATE_CACHE_TTL_SECONDS, state);
  }

  // Not called anywhere in the normal request path - a 90-day TTL already
  // self-heals a bad cached value, this is just an escape hatch for manual
  // invalidation (e.g. a support/ops action) if one's ever needed sooner.
  public async deleteStateForPincode(pincode: string) {
    await this.deleteData(this.getPincodeStateKey(pincode));
  }
}
