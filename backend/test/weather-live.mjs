import 'reflect-metadata';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { OpenWeatherService } from '../dist/modules/weather/openweather.service.js';
import { WeatherService } from '../dist/modules/weather/weather.service.js';
config({ path: new URL('../../.env', import.meta.url), quiet: true });
const weather = new WeatherService(
  new OpenWeatherService(new ConfigService(process.env), globalThis.fetch),
);
try {
  const locations = await weather.search({ q: 'Ha Noi', country: 'VN' });
  if (!locations.length) throw new Error('EMPTY_GEOCODING');
  const { latitude: lat, longitude: lon } = locations[0];
  const current = await weather.current({ lat, lon });
  const forecast = await weather.forecast({ lat, lon });
  const cached = await weather.current({ lat, lon });
  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        geocodingResults: locations.length,
        current: {
          temperatureC: current.temperatureC,
          observedAt: current.observedAt,
        },
        forecast: {
          slots: forecast.slots.length,
          days: forecast.days.length,
          intervalHours: forecast.intervalHours,
        },
        cacheHit: cached.source.cached,
        alerts: weather.alerts().status,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    'OpenWeather smoke test failed:',
    error.getResponse?.()?.code ?? 'UNEXPECTED_ERROR',
  );
  process.exitCode = 1;
}
