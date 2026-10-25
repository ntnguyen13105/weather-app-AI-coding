export function temperature(value, unit = 'C') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${Math.round(unit === 'F' ? (value * 9) / 5 + 32 : value)}°`;
}
export function temperatureValue(value, unit) {
  return unit === 'F' ? (value * 9) / 5 + 32 : value;
}
export function localTime(
  iso,
  offset = 0,
  options = { hour: '2-digit', minute: '2-digit' },
) {
  if (!iso) return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(Date.parse(iso) + offset * 1000));
}
export function utcLabel(offset) {
  const minutes = Math.abs(offset) / 60;
  return `UTC${offset >= 0 ? '+' : '−'}${Math.floor(minutes / 60)}${minutes % 60 ? `:${String(minutes % 60).padStart(2, '0')}` : ''}`;
}
export function direction(deg) {
  return deg == null
    ? ''
    : [
        'Bắc',
        'Đông Bắc',
        'Đông',
        'Đông Nam',
        'Nam',
        'Tây Nam',
        'Tây',
        'Tây Bắc',
      ][Math.round(deg / 45) % 8];
}
export function locationInput(location) {
  return {
    name: location.name,
    country: location.country,
    state: location.state ?? null,
    latitude: location.latitude,
    longitude: location.longitude,
  };
}
export function readUnit() {
  try {
    return localStorage.getItem('weather-unit') === 'F' ? 'F' : 'C';
  } catch {
    return 'C';
  }
}
export function saveUnit(unit) {
  try {
    localStorage.setItem('weather-unit', unit);
  } catch {
    /* Storage is optional; keep the in-memory preference. */
  }
}
