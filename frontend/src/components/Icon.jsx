const paths = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3" />
    </>
  ),
  drop: <path d="M12 2C10 6 5 11 5 15a7 7 0 0 0 14 0c0-4-5-9-7-13Z" />,
  pressure: (
    <>
      <path d="M4 20a10 10 0 1 1 16 0M12 12l5-5M5 12h2m10 0h2M12 3v3" />
      <circle cx="12" cy="13" r="2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  sunrise: (
    <>
      <path d="M3 18h18M5 15a7 7 0 0 1 14 0M12 2v7m-3-4 3-3 3 3M2 11l2 1m16 0 2-1M6 5l1 2m10 0 1-2M6 22h12" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 8a9 9 0 0 0-15-3L2 8m0-6v6h6M4 16a9 9 0 0 0 15 3l3-3m0 6v-6h-6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
};
export function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] ?? paths.info}
    </svg>
  );
}
export function WeatherIcon({ kind = 'UNKNOWN', size = 64 }) {
  const clear = kind.startsWith('CLEAR');
  const night = kind.endsWith('NIGHT');
  return (
    <svg
      className="weather-icon"
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      {(clear || kind.startsWith('PARTLY')) &&
        (night ? (
          <path
            d="M49 12a23 23 0 1 0 17 34 25 25 0 0 1-17-34Z"
            fill="#e3eafa"
          />
        ) : (
          <>
            <circle cx="38" cy="34" r="16" fill="#f4ce7d" />
            <path
              d="M38 6v5m0 46v5M10 34h5m46 0h5M18 14l4 4m32 32 4 4M18 54l4-4m32-32 4-4"
              stroke="#f4ce7d"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ))}
      {!clear && (
        <path
          d="M18 56a13 13 0 1 1 3-26 20 20 0 0 1 38 5 11 11 0 1 1 2 21H18Z"
          fill="#dce8f4"
          stroke="#a9bfd3"
          strokeWidth="1.5"
        />
      )}
      {kind === 'RAIN' && (
        <path
          d="m25 63-4 8m20-8-4 8m20-8-4 8"
          stroke="#90d3f0"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
      {kind === 'THUNDERSTORM' && (
        <path d="m42 48-12 17h10l-5 12 18-20H42l4-9Z" fill="#f4ce7d" />
      )}
      {kind === 'SNOW' && (
        <path
          d="M28 62v12m-5-9 10 6m0-6-10 6M53 62v12m-5-9 10 6m0-6-10 6"
          stroke="#eef7ff"
          strokeWidth="2"
        />
      )}
      {kind === 'MIST' && (
        <path d="M14 62h48M23 69h44" stroke="#dce8f4" strokeWidth="2" />
      )}
      {kind === 'UNKNOWN' && (
        <text x="40" y="49" textAnchor="middle" fill="#243c52" fontSize="22">
          ?
        </text>
      )}
    </svg>
  );
}
