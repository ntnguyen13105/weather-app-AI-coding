import { Inject, Injectable, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fail } from '../../common/api-error.js';
export const WEATHER_FETCH = Symbol('WEATHER_FETCH');
type CacheEntry = { data: unknown; expires: number };
@Injectable()
export class OpenWeatherService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly flights = new Map<string, Promise<unknown>>();
  private calls: number[] = [];
  private active = 0;
  constructor(
    private readonly config: ConfigService,
    @Inject(WEATHER_FETCH) private readonly fetcher: typeof fetch,
  ) {}
  async get<T>(
    path: '/geo/1.0/direct' | '/data/2.5/weather' | '/data/2.5/forecast',
    params: Record<string, string>,
    mapper: (raw: unknown) => T,
    ttl: number,
  ): Promise<{ data: T; cached: boolean }> {
    const key = `${path}?${new URLSearchParams(params)}`;
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return { data: cached.data as T, cached: true };
    }
    this.cache.delete(key);
    const existing = this.flights.get(key);
    if (existing) return { data: (await existing) as T, cached: false };
    const flight = this.load(path, params, mapper)
      .then((data) => {
        this.cache.set(key, {
          data,
          expires:
            Date.now() +
            (Array.isArray(data) && data.length === 0 ? 60000 : ttl),
        });
        while (this.cache.size > 500)
          this.cache.delete(this.cache.keys().next().value!);
        return data;
      })
      .finally(() => {
        this.flights.delete(key);
      });
    this.flights.set(key, flight);
    return { data: await flight, cached: false };
  }
  private async load<T>(
    path: string,
    params: Record<string, string>,
    mapper: (raw: unknown) => T,
  ): Promise<T> {
    const apiKey = this.config.get<string>('OPENWEATHER_API_KEY');
    if (!apiKey?.trim()) fail(503, 'WEATHER_UNAVAILABLE');
    const now = Date.now();
    this.calls = this.calls.filter((t) => t > now - 60000);
    if (this.active >= 4 || this.calls.length >= 40)
      throw new HttpException(
        { code: 'WEATHER_QUOTA_EXCEEDED', retryAfter: 60 },
        503,
      );
    this.calls.push(now);
    this.active++;
    try {
      const url = new URL(path, 'https://api.openweathermap.org');
      url.search = new URLSearchParams({ ...params, appid: apiKey }).toString();
      const response = await this.fetcher(url, {
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 429)
          throw new HttpException(
            { code: 'WEATHER_QUOTA_EXCEEDED', retryAfter: 60 },
            503,
          );
        if ([401, 403].includes(response.status))
          fail(503, 'WEATHER_UNAVAILABLE');
        fail(502, 'WEATHER_UPSTREAM_ERROR');
      }
      if (!response.body) fail(502, 'WEATHER_INVALID_RESPONSE');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1048576) {
            await reader.cancel();
            fail(502, 'WEATHER_INVALID_RESPONSE');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      let raw: unknown;
      try {
        raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        fail(502, 'WEATHER_INVALID_RESPONSE');
      }
      return mapper(raw);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Error &&
        ['TimeoutError', 'AbortError'].includes(error.name)
      )
        fail(504, 'WEATHER_TIMEOUT');
      fail(503, 'WEATHER_UNAVAILABLE');
    } finally {
      this.active--;
    }
  }
}
