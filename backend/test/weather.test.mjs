import 'reflect-metadata';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { OpenWeatherService } from '../dist/modules/weather/openweather.service.js';
import { WeatherService } from '../dist/modules/weather/weather.service.js';
import {
  mapCurrent,
  mapForecast,
  mapSearch,
} from '../dist/modules/weather/weather.mapper.js';
const { Response, DOMException } = globalThis;
// Explicit fixtures for tests only, never fallback application weather.
const current = {
  coord: { lat: 21, lon: 105 },
  name: 'Hanoi',
  timezone: 25200,
  dt: 1792814400,
  main: { temp: 25, feels_like: 26 },
  weather: [{ id: 800, icon: '01d', description: 'trời quang' }],
};
const forecast = {
  city: {
    coord: { lat: 21, lon: 105 },
    name: 'Hanoi',
    country: 'VN',
    timezone: 25200,
  },
  list: Array.from({ length: 10 }, (_, i) => ({
    dt: 1792774800 + i * 10800,
    main: { temp: 20 + i },
    weather: [{ id: 803, icon: '04d' }],
  })),
};
const config = new ConfigService({ OPENWEATHER_API_KEY: 'unit-test-key' });
afterEach(() => vi.useRealTimers());
describe('Weather normalization', () => {
  it('preserves missing optional metrics as null and does not invent observations', () => {
    const r = mapCurrent(current);
    expect(r.temperatureC).toBe(25);
    expect(r.visibilityM).toBeNull();
    expect(r.sunriseAt).toBeNull();
    expect(r.areaMinC).toBeNull();
    expect(
      mapCurrent({ ...current, weather: [{ id: 499 }] }).condition.icon,
    ).toBe('UNKNOWN');
    expect(() => mapCurrent({ ...current, main: { temp: '25' } })).toThrow();
    expect(() => mapCurrent({ ...current, dt: Infinity })).toThrow();
  });
  it('uses Vietnamese geocoding names and normalized coordinates', () => {
    expect(
      mapSearch([
        {
          lat: -0.00001,
          lon: 105.123456,
          name: 'Hanoi',
          local_names: { vi: 'Hà Nội' },
          country: 'VN',
        },
      ])[0],
    ).toMatchObject({ name: 'Hà Nội', locationKey: 'ow:0.0000:105.1235' });
    expect(mapSearch([])).toEqual([]);
    expect(() => mapSearch({ message: 'error' })).toThrow();
  });
  it('groups actual slots in local time, keeps partial days and sampled extrema', () => {
    const r = mapForecast(forecast);
    expect(r.intervalHours).toBe(3);
    expect(r.slots).toHaveLength(10);
    expect(r.days.reduce((n, d) => n + d.slotCount, 0)).toBe(10);
    for (const day of r.days) {
      const slots = r.slots.filter((s) =>
        new Date(Date.parse(s.at) + 25200000)
          .toISOString()
          .startsWith(day.date),
      );
      expect(day.sampleMinC).toBe(
        Math.min(...slots.map((s) => s.temperatureC)),
      );
      expect(day.isPartial).toBe(day.slotCount !== 8);
    }
    expect(mapForecast({ ...forecast, list: [] })).toMatchObject({
      slots: [],
      days: [],
      rangeStartAt: null,
      rangeEndAt: null,
    });
    expect(() =>
      mapForecast({ ...forecast, list: [forecast.list[0], forecast.list[0]] }),
    ).toThrow();
  });
});
describe('OpenWeather boundary', () => {
  it('coalesces concurrent requests and preserves fetchedAt on cache hits', async () => {
    const transport = vi.fn(async () => Response.json(current));
    const weather = new WeatherService(
      new OpenWeatherService(config, transport),
    );
    const [a, b] = await Promise.all([
      weather.current({ lat: 21, lon: 105 }),
      weather.current({ lat: 21, lon: 105 }),
    ]);
    const c = await weather.current({ lat: 21, lon: 105 });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(c.source.cached).toBe(true);
    expect(c.source.fetchedAt).toBe(a.source.fetchedAt);
    expect(b.temperatureC).toBe(25);
    const [url, options] = transport.mock.calls[0];
    expect(url.origin).toBe('https://api.openweathermap.org');
    expect(url.searchParams.get('units')).toBe('metric');
    expect(options.redirect).toBe('error');
  });
  it.each([
    [401, 503, 'WEATHER_UNAVAILABLE'],
    [403, 503, 'WEATHER_UNAVAILABLE'],
    [429, 503, 'WEATHER_QUOTA_EXCEEDED'],
    [500, 502, 'WEATHER_UPSTREAM_ERROR'],
    [404, 502, 'WEATHER_UPSTREAM_ERROR'],
  ])(
    'normalizes provider HTTP %s without caching errors',
    async (upstream, status, code) => {
      const transport = vi
        .fn()
        .mockImplementationOnce(
          async () =>
            new Response('secret-provider-error', { status: upstream }),
        )
        .mockImplementationOnce(async () => Response.json(current));
      const weather = new WeatherService(
        new OpenWeatherService(config, transport),
      );
      try {
        await weather.current({ lat: 21, lon: 105 });
        throw new Error('expected error');
      } catch (e) {
        expect(e.getStatus()).toBe(status);
        expect(e.getResponse().code).toBe(code);
        expect(JSON.stringify(e.getResponse())).not.toContain('secret');
      }
      expect((await weather.current({ lat: 21, lon: 105 })).temperatureC).toBe(
        25,
      );
      expect(transport).toHaveBeenCalledTimes(2);
    },
  );
  it('rejects timeout, network errors, invalid JSON and malformed weather', async () => {
    for (const [response, status] of [
      [
        () => {
          throw new DOMException('test', 'TimeoutError');
        },
        504,
      ],
      [
        () => {
          throw new Error('private network detail');
        },
        503,
      ],
      [() => new Response('{'), 502],
      [() => Response.json({}), 502],
    ]) {
      const weather = new WeatherService(
        new OpenWeatherService(config, async () => response()),
      );
      await expect(
        weather.current({ lat: 21, lon: 105 }),
      ).rejects.toMatchObject({ status });
    }
  });
  it('expires successful empty geocoding results after 60 seconds', async () => {
    vi.useFakeTimers();
    const transport = vi.fn(async () => Response.json([]));
    const weather = new WeatherService(
      new OpenWeatherService(config, transport),
    );
    await weather.search({ q: 'unknown' });
    await weather.search({ q: 'unknown' });
    expect(transport).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60001);
    await weather.search({ q: 'unknown' });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('enforces a shared provider budget and makes no request for unsupported alerts', async () => {
    const transport = vi.fn(async () => Response.json([]));
    const weather = new WeatherService(
      new OpenWeatherService(config, transport),
    );
    expect(weather.alerts().status).toBe('UNSUPPORTED');
    expect(transport).not.toHaveBeenCalled();
    for (let i = 0; i < 40; i++) await weather.search({ q: `city-${i}` });
    await expect(weather.search({ q: 'extra' })).rejects.toMatchObject({
      status: 503,
    });
    expect(transport).toHaveBeenCalledTimes(40);
  });
});
