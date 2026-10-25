import { Icon, WeatherIcon } from './Icon.jsx';
import { direction, localTime, temperature, utcLabel } from '../lib/format.js';
export function CurrentWeather({ data, location, unit, favoriteAction }) {
  const offset = data.location.utcOffsetSeconds;
  const details = [
    ['drop', 'Độ ẩm', data.humidityPercent, '%'],
    [
      'wind',
      'Gió',
      data.windSpeedMs,
      'm/s',
      direction(data.windDirectionDegrees),
    ],
    ['pressure', 'Áp suất', data.pressureHpa, 'hPa'],
    [
      'eye',
      'Tầm nhìn',
      data.visibilityM == null
        ? null
        : Number((data.visibilityM / 1000).toFixed(1)),
      'km',
    ],
  ];
  const country = new Intl.DisplayNames(['vi'], { type: 'region' }).of(
    location.country,
  );
  return (
    <>
      <section className="current-card glass" aria-labelledby="location-title">
        <div className="current-top">
          <div>
            <div className="location-meta">
              <Icon name="pin" size={16} />
              {[location.state, country].filter(Boolean).join(' · ')}
            </div>
            <h1 id="location-title">{location.name}</h1>
          </div>
          {favoriteAction}
        </div>
        <div className="current-body">
          <div>
            <div className="main-temperature">
              {temperature(data.temperatureC, unit)}
              <span>{unit}</span>
            </div>
            <p className="condition">{data.condition.description}</p>
            <p className="muted">
              Cảm nhận {temperature(data.feelsLikeC, unit)}
              {unit}
            </p>
          </div>
          <WeatherIcon kind={data.condition.icon} size={154} />
        </div>
        <div className="current-bottom">
          <div>
            <span className="live-dot" />
            Thời tiết hiện tại
            <span className="muted">
              {' '}
              · {localTime(data.observedAt, offset)} · {utcLabel(offset)}
            </span>
          </div>
          <p className="muted">
            {data.areaMinC != null && data.areaMaxC != null
              ? `Trong khu vực: ${temperature(data.areaMinC, unit)} – ${temperature(data.areaMaxC, unit)}${unit}`
              : 'Chưa có khoảng nhiệt độ khu vực'}
          </p>
        </div>
      </section>
      <section className="details-grid" aria-label="Chỉ số thời tiết">
        {details.map(([icon, label, value, suffix, note]) => (
          <div className="metric glass" key={label}>
            <div className="metric-label">
              <Icon name={icon} />
              {label}
            </div>
            <p className="metric-value">
              {value == null ? (
                <span className="missing">Chưa có dữ liệu</span>
              ) : (
                <>
                  {value}
                  <span>{suffix}</span>
                </>
              )}
            </p>
            {note && <span className="muted metric-note">Hướng {note}</span>}
          </div>
        ))}
      </section>
      <section className="sun-strip glass" aria-label="Mặt trời">
        <div>
          <Icon name="sunrise" size={25} />
          <span>
            Bình minh<strong>{localTime(data.sunriseAt, offset)}</strong>
          </span>
        </div>
        <div className="sun-track" aria-hidden="true">
          <span />
          <Icon name="sun" size={20} />
          <span />
        </div>
        <div>
          <Icon name="sunrise" size={25} />
          <span>
            Hoàng hôn<strong>{localTime(data.sunsetAt, offset)}</strong>
          </span>
        </div>
      </section>
      <p className="source-time">
        Dữ liệu nguồn:{' '}
        {localTime(data.observedAt, offset, {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}{' '}
        · Nhận lúc {localTime(data.source.fetchedAt, offset)}
        {data.source.cached ? ' · Được lưu tạm' : ''}
      </p>
    </>
  );
}
