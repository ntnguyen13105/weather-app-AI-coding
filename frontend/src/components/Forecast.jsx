import { useId, useState } from 'react';
import { Icon, WeatherIcon } from './Icon.jsx';
import { localTime, temperature, temperatureValue } from '../lib/format.js';
export function TemperatureChart({ slots, unit }) {
  const id = useId();
  if (slots.length < 2) return null;
  const min =
    Math.min(...slots.map((s) => temperatureValue(s.temperatureC, unit))) - 2;
  const max =
    Math.max(...slots.map((s) => temperatureValue(s.temperatureC, unit))) + 2;
  const start = Date.parse(slots[0].at),
    end = Date.parse(slots.at(-1).at);
  const points = slots.map((s) => ({
    x: 40 + ((Date.parse(s.at) - start) / (end - start)) * 720,
    y:
      120 - ((temperatureValue(s.temperatureC, unit) - min) / (max - min)) * 90,
  }));
  const path = points
    .map(
      (p, i) =>
        `${i === 0 || Date.parse(slots[i].at) - Date.parse(slots[i - 1].at) !== 10800000 ? 'M' : 'L'}${p.x},${p.y}`,
    )
    .join(' ');
  return (
    <svg
      className="temperature-chart"
      viewBox="0 0 800 150"
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>
        Biểu đồ nhiệt độ °{unit}. Giá trị từng mốc có trong danh sách ngay dưới.
      </title>
      {[min, (min + max) / 2, max].map((v, i) => (
        <g key={i}>
          <line
            x1="40"
            x2="760"
            y1={120 - i * 45}
            y2={120 - i * 45}
            stroke="currentColor"
            opacity=".12"
          />
          <text x="3" y={124 - i * 45} fill="currentColor" fontSize="12">
            {Math.round(v)}°
          </text>
        </g>
      ))}
      <path
        d={path}
        fill="none"
        stroke="#a7e0ed"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#a7e0ed" />
      ))}
    </svg>
  );
}
export function Forecast({ data, unit }) {
  const [expanded, setExpanded] = useState(false);
  const slots = expanded ? data.slots : data.slots.slice(0, 16),
    offset = data.location.utcOffsetSeconds;
  return (
    <>
      <section className="forecast glass" aria-labelledby="forecast-title">
        <div className="section-heading">
          <h2 id="forecast-title">
            <Icon name="clock" />
            Dự báo mỗi 3 giờ
          </h2>
          <span className="muted">{slots.length} mốc dự báo</span>
        </div>
        {slots.length ? (
          <>
            <div
              className="chart-scroll"
              tabIndex={0}
              role="region"
              aria-label="Biểu đồ nhiệt độ, cuộn ngang để xem"
            >
              <TemperatureChart slots={slots} unit={unit} />
            </div>
            <div
              className="timeline"
              tabIndex={0}
              role="region"
              aria-label="Mốc dự báo 3 giờ, cuộn ngang để xem thêm"
            >
              {slots.map((slot) => (
                <div className="time-slot" key={slot.at}>
                  <time dateTime={slot.at}>
                    {localTime(slot.at, offset)}
                    <small>
                      {localTime(slot.at, offset, {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </small>
                  </time>
                  <WeatherIcon kind={slot.condition.icon} size={44} />
                  <span className="sr-only">{slot.condition.description}</span>
                  <strong>
                    {temperature(slot.temperatureC, unit)}
                    {unit}
                  </strong>
                  <span className="rain-probability">
                    <Icon name="drop" size={12} />
                    {slot.precipitationProbability == null
                      ? '—'
                      : `${Math.round(slot.precipitationProbability * 100)}%`}
                  </span>
                </div>
              ))}
            </div>
            {data.slots.length > 16 && (
              <button
                className="text-button"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded ? 'Thu gọn' : 'Xem toàn bộ mốc dự báo'}
              </button>
            )}
            <p className="section-note">
              Xác suất mưa theo từng mốc. Đường biểu đồ ngắt khi nguồn thiếu dữ
              liệu.
            </p>
          </>
        ) : (
          <p className="empty-copy">
            Nguồn chưa có mốc dự báo cho địa điểm này.
          </p>
        )}
      </section>
      <section className="daily glass" aria-labelledby="daily-title">
        <div className="section-heading">
          <h2 id="daily-title">Những ngày sắp tới</h2>
          <span className="muted">Dải dự báo 5 ngày</span>
        </div>
        <p className="section-note">
          Tổng hợp từ các mốc 3 giờ · Trạng thái đại diện gần trưa.
        </p>
        <div className="daily-list">
          {data.days.map((day) => (
            <div className="daily-row" key={day.date}>
              <div className="day-label">
                <strong>
                  {localTime(`${day.date}T12:00:00Z`, 0, { weekday: 'long' })}
                </strong>
                <span>
                  {localTime(`${day.date}T12:00:00Z`, 0, {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </div>
              <WeatherIcon kind={day.representativeCondition.icon} size={40} />
              <span className="sr-only">
                {day.representativeCondition.description}
              </span>
              <span className="day-condition" aria-hidden="true">
                {day.representativeCondition.description}
              </span>
              <div className="day-range">
                <span>{temperature(day.sampleMinC, unit)}</span>
                <span className="range-rule" />
                <strong>
                  {temperature(day.sampleMaxC, unit)}
                  {unit}
                </strong>
              </div>
              <span
                className={`day-coverage ${day.isPartial ? 'partial' : ''}`}
              >
                {day.isPartial ? `${day.slotCount}/8 mốc` : 'Đủ 8 mốc'}
                <span className="sr-only">
                  {day.isPartial ? ' · Chưa đủ dữ liệu cả ngày' : ''}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="section-note">
          Khoảng nhiệt độ tính từ các mốc có sẵn, không phải cực trị của cả
          ngày. Ngày đầu hoặc cuối có thể chưa đủ dữ liệu.
        </p>
      </section>
    </>
  );
}
