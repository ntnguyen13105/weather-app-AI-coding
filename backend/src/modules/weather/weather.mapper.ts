import { fail } from '../../common/api-error.js';
import { coordinates } from '../../common/location.js';

function invalid(): never {
  return fail(502, 'WEATHER_INVALID_RESPONSE');
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}
function num(value: unknown, min = -Infinity, max = Infinity): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    invalid();
  return value;
}
function optional(value: unknown, min = -Infinity, max = Infinity) {
  return value == null ? null : num(value, min, max);
}
function text(value: unknown, max = 160): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    invalid();
  return value;
}
function iso(value: unknown) {
  const time = num(value, 0, 253402300799);
  if (!Number.isInteger(time)) invalid();
  return new Date(time * 1000).toISOString();
}
function country(value: unknown) {
  const code = text(value, 2);
  if (!/^[A-Z]{2}$/.test(code)) invalid();
  return code;
}
function condition(value: unknown) {
  if (!Array.isArray(value) || !value.length) invalid();
  const w = object(value[0]);
  const code = num(w.id, 0, 9999);
  if (!Number.isInteger(code)) invalid();
  const night = typeof w.icon === 'string' && w.icon.endsWith('n');
  let icon = 'UNKNOWN';
  if (code === 800) icon = night ? 'CLEAR_NIGHT' : 'CLEAR_DAY';
  else if (code === 801)
    icon = night ? 'PARTLY_CLOUDY_NIGHT' : 'PARTLY_CLOUDY_DAY';
  else if (code >= 802 && code <= 804) icon = 'CLOUDY';
  else if (code >= 200 && code < 300) icon = 'THUNDERSTORM';
  else if ((code >= 300 && code < 400) || (code >= 500 && code < 600))
    icon = 'RAIN';
  else if (code >= 600 && code < 700) icon = 'SNOW';
  else if (code >= 700 && code < 800) icon = 'MIST';
  const labels: Record<string, string> = {
    CLEAR_DAY: 'Trời quang',
    CLEAR_NIGHT: 'Đêm quang',
    PARTLY_CLOUDY_DAY: 'Ít mây',
    PARTLY_CLOUDY_NIGHT: 'Ít mây',
    CLOUDY: 'Nhiều mây',
    THUNDERSTORM: 'Dông',
    RAIN: 'Mưa',
    SNOW: 'Tuyết',
    MIST: 'Sương mù',
    UNKNOWN: 'Chưa xác định',
  };
  return {
    code,
    icon,
    description:
      icon === 'UNKNOWN'
        ? labels.UNKNOWN
        : typeof w.description === 'string' &&
            w.description.trim() &&
            w.description.length <= 200
          ? w.description
          : labels[icon],
  };
}
function location(
  coord: unknown,
  name: unknown,
  code: unknown,
  offset: unknown,
) {
  const c = object(coord);
  const utcOffsetSeconds = num(offset, -86400, 86400);
  if (!Number.isInteger(utcOffsetSeconds)) invalid();
  return {
    latitude: num(c.lat, -90, 90),
    longitude: num(c.lon, -180, 180),
    name: name == null || name === '' ? null : text(name),
    country: code == null || code === '' ? null : country(code),
    utcOffsetSeconds,
    timeZone: null,
  };
}
const source = (product: 'CURRENT' | 'FORECAST_5_DAY') => ({
  provider: 'OPENWEATHER' as const,
  product,
  fetchedAt: new Date().toISOString(),
  cached: false,
});
export function mapSearch(raw: unknown) {
  if (!Array.isArray(raw) || raw.length > 5) invalid();
  const results = raw.map((value) => {
    const row = object(value);
    const local = row.local_names == null ? {} : object(row.local_names);
    return {
      ...coordinates(num(row.lat, -90, 90), num(row.lon, -180, 180)),
      name: text(local.vi ?? row.name),
      country: country(row.country),
      state: row.state == null ? null : text(row.state),
    };
  });
  return [...new Map(results.map((row) => [row.locationKey, row])).values()];
}
export function mapCurrent(raw: unknown) {
  const r = object(raw),
    main = object(r.main),
    sys = r.sys == null ? {} : object(r.sys),
    wind = r.wind == null ? {} : object(r.wind);
  return {
    location: location(r.coord, r.name, sys.country, r.timezone),
    observedAt: iso(r.dt),
    temperatureC: num(main.temp),
    feelsLikeC: num(main.feels_like),
    areaMinC: optional(main.temp_min),
    areaMaxC: optional(main.temp_max),
    condition: condition(r.weather),
    humidityPercent: optional(main.humidity, 0, 100),
    windSpeedMs: optional(wind.speed, 0),
    windDirectionDegrees: optional(wind.deg, 0, 360),
    pressureHpa: optional(main.pressure, Number.MIN_VALUE),
    visibilityM: optional(r.visibility, 0),
    sunriseAt: sys.sunrise == null ? null : iso(sys.sunrise),
    sunsetAt: sys.sunset == null ? null : iso(sys.sunset),
    source: source('CURRENT'),
  };
}
export function mapForecast(raw: unknown) {
  const r = object(raw),
    city = object(r.city);
  const place = location(city.coord, city.name, city.country, city.timezone);
  if (!Array.isArray(r.list) || r.list.length > 40) invalid();
  const slots = r.list
    .map((value) => {
      const row = object(value),
        main = object(row.main),
        wind = row.wind == null ? {} : object(row.wind);
      return {
        at: iso(row.dt),
        temperatureC: num(main.temp),
        feelsLikeC: optional(main.feels_like),
        condition: condition(row.weather),
        precipitationProbability: optional(row.pop, 0, 1),
        humidityPercent: optional(main.humidity, 0, 100),
        windSpeedMs: optional(wind.speed, 0),
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at));
  if (new Set(slots.map((s) => s.at)).size !== slots.length) invalid();
  const groups = new Map<string, typeof slots>();
  for (const slot of slots) {
    const date = new Date(Date.parse(slot.at) + place.utcOffsetSeconds * 1000)
      .toISOString()
      .slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), slot]);
  }
  const days = [...groups].map(([date, items]) => {
    const noon =
      Date.parse(`${date}T12:00:00Z`) - place.utcOffsetSeconds * 1000;
    const representative = items.reduce((a, b) =>
      Math.abs(Date.parse(a.at) - noon) <= Math.abs(Date.parse(b.at) - noon)
        ? a
        : b,
    );
    return {
      date,
      sampleMinC: Math.min(...items.map((i) => i.temperatureC)),
      sampleMaxC: Math.max(...items.map((i) => i.temperatureC)),
      representativeCondition: representative.condition,
      representativeAt: representative.at,
      slotCount: items.length,
      isPartial:
        items.length !== 8 ||
        items.some(
          (s, i) =>
            i > 0 &&
            Date.parse(s.at) - Date.parse(items[i - 1].at) !== 10800000,
        ),
    };
  });
  return {
    location: place,
    intervalHours: 3 as const,
    rangeStartAt: slots[0]?.at ?? null,
    rangeEndAt: slots.at(-1)?.at ?? null,
    slots,
    days,
    source: source('FORECAST_5_DAY'),
  };
}
