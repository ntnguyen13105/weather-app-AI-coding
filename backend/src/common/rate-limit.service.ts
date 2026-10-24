import { Injectable, HttpException } from '@nestjs/common';

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<
    string,
    { times: number[]; window: number }
  >();
  check(key: string, limit: number, window: number, now = Date.now()) {
    for (const [k, bucket] of this.buckets)
      if (bucket.times.at(-1)! <= now - bucket.window) this.buckets.delete(k);
    const bucket = this.buckets.get(key) ?? { times: [], window };
    bucket.times = bucket.times.filter((time) => time > now - window);
    if (
      bucket.times.length >= limit ||
      (!this.buckets.has(key) && this.buckets.size >= 10000)
    ) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          retryAfter: Math.max(
            1,
            Math.ceil(((bucket.times[0] ?? now) + window - now) / 1000),
          ),
        },
        429,
      );
    }
    bucket.times.push(now);
    this.buckets.set(key, bucket);
  }
}
