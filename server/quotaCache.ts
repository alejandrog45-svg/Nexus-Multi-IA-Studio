import { createHash } from 'node:crypto';

// Pure, testable helpers used by server.ts to protect the free Gemini quota
// (about 20 requests/day per model): rotate models, remember which are exhausted, cache answers.

export class QuotaTracker {
  private day = '';
  private counts = new Map<string, number>();
  private blockedUntil = new Map<string, number>();

  constructor(
    private readonly models: string[],
    private readonly dailyLimit: number,
    private readonly now: () => number = () => Date.now()
  ) {}

  private today(): string {
    return new Date(this.now()).toISOString().slice(0, 10);
  }

  private roll(): void {
    const d = this.today();
    if (d !== this.day) {
      this.day = d;
      this.counts.clear();
      this.blockedUntil.clear();
    }
  }

  /** Models that can still be tried now, least used first (ties keep pool order). `preferred` goes first if available. */
  order(preferred?: string): string[] {
    this.roll();
    const t = this.now();
    const available = this.models
      .map((m, i) => ({ m, i, c: this.counts.get(m) || 0 }))
      .filter(({ m, c }) => c < this.dailyLimit && (this.blockedUntil.get(m) || 0) <= t)
      .sort((a, b) => a.c - b.c || a.i - b.i)
      .map(({ m }) => m);
    if (preferred && available.includes(preferred)) {
      return [preferred, ...available.filter((m) => m !== preferred)];
    }
    return available;
  }

  /** Count one request actually sent to the provider. */
  record(model: string): void {
    this.roll();
    this.counts.set(model, (this.counts.get(model) || 0) + 1);
  }

  /** Block a model after a 429: until end of the UTC day if the error is per-day, otherwise 60 s. */
  markLimited(model: string, errorText: string): void {
    this.roll();
    const perDay = /per ?day|daily|PerDay/i.test(errorText || '');
    if (perDay) {
      const end = new Date(this.now());
      end.setUTCHours(24, 0, 0, 0);
      this.blockedUntil.set(model, end.getTime());
    } else {
      this.blockedUntil.set(model, this.now() + 60_000);
    }
  }

  stats() {
    this.roll();
    const t = this.now();
    return {
      day: this.day,
      dailyLimit: this.dailyLimit,
      models: this.models.map((m) => ({
        model: m,
        used: this.counts.get(m) || 0,
        blocked: (this.blockedUntil.get(m) || 0) > t,
      })),
    };
  }
}

export class ResponseCache {
  private store = new Map<string, { text: string; at: number }>();

  constructor(
    private readonly ttlMs = 60 * 60 * 1000,
    private readonly maxEntries = 200,
    private readonly now: () => number = () => Date.now()
  ) {}

  static key(parts: unknown): string {
    return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
  }

  get(key: string): string | null {
    const hit = this.store.get(key);
    if (!hit) return null;
    if (this.now() - hit.at > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    // refresh recency (Map keeps insertion order)
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.text;
  }

  set(key: string, text: string): void {
    if (!text) return;
    this.store.delete(key);
    this.store.set(key, { text, at: this.now() });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  size(): number {
    return this.store.size;
  }
}
