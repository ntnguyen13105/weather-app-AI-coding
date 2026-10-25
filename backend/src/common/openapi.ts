import type { OpenAPIObject, SchemaObject } from '@nestjs/swagger';

const str: SchemaObject = { type: 'string' };
const number: SchemaObject = { type: 'number' };
const integer: SchemaObject = { type: 'integer' };
const date: SchemaObject = { type: 'string', format: 'date-time' };
const id: SchemaObject = { type: 'string', format: 'uuid' };
const bool: SchemaObject = { type: 'boolean' };
const nullable = (s: SchemaObject): SchemaObject => ({ ...s, nullable: true });
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const array = (name: string): SchemaObject => ({
  type: 'array',
  items: ref(name),
});
const object = (
  properties: SchemaObject['properties'],
  required = Object.keys(properties ?? {}),
): SchemaObject => ({ type: 'object', properties, required });
const schemas: Record<string, SchemaObject> = {
  PublicUser: object({
    id,
    email: { ...str, format: 'email' },
    displayName: str,
    preferredTemperatureUnit: { ...str, enum: ['C', 'F'] },
    createdAt: date,
    updatedAt: date,
  }),
  AuthResult: object({
    user: ref('PublicUser'),
    csrfToken: str,
    accessExpiresAt: date,
    sessionExpiresAt: date,
  }),
  CsrfResult: object({ csrfToken: str, expiresAt: date }),
  Location: object({
    locationKey: str,
    name: str,
    country: str,
    state: nullable(str),
    latitude: number,
    longitude: number,
  }),
  Favorite: object({ id, location: ref('Location'), createdAt: date }),
  HistoryItem: object({ id, location: ref('Location'), searchedAt: date }),
  Condition: object({
    code: integer,
    description: str,
    icon: {
      ...str,
      enum: [
        'CLEAR_DAY',
        'CLEAR_NIGHT',
        'PARTLY_CLOUDY_DAY',
        'PARTLY_CLOUDY_NIGHT',
        'CLOUDY',
        'RAIN',
        'THUNDERSTORM',
        'SNOW',
        'MIST',
        'UNKNOWN',
      ],
    },
  }),
  WeatherLocation: object({
    latitude: number,
    longitude: number,
    name: nullable(str),
    country: nullable(str),
    utcOffsetSeconds: integer,
    timeZone: {
      ...nullable(str),
      description: 'Luôn null: nguồn hiện tại không cung cấp IANA timezone.',
    },
  }),
  WeatherSource: object({
    provider: { ...str, enum: ['OPENWEATHER'] },
    product: { ...str, enum: ['CURRENT', 'FORECAST_5_DAY'] },
    fetchedAt: date,
    cached: bool,
  }),
  CurrentWeather: object({
    location: ref('WeatherLocation'),
    observedAt: date,
    temperatureC: number,
    feelsLikeC: number,
    areaMinC: nullable(number),
    areaMaxC: nullable(number),
    condition: ref('Condition'),
    humidityPercent: nullable(number),
    windSpeedMs: nullable(number),
    windDirectionDegrees: nullable(number),
    pressureHpa: nullable(number),
    visibilityM: nullable(number),
    sunriseAt: nullable(date),
    sunsetAt: nullable(date),
    source: ref('WeatherSource'),
  }),
  ForecastSlot: object({
    at: date,
    temperatureC: number,
    feelsLikeC: nullable(number),
    condition: ref('Condition'),
    precipitationProbability: nullable({ ...number, minimum: 0, maximum: 1 }),
    humidityPercent: nullable(number),
    windSpeedMs: nullable(number),
  }),
  ForecastDay: object({
    date: { ...str, format: 'date' },
    sampleMinC: number,
    sampleMaxC: number,
    representativeCondition: ref('Condition'),
    representativeAt: date,
    slotCount: integer,
    isPartial: bool,
  }),
  Forecast: object({
    location: ref('WeatherLocation'),
    intervalHours: { ...integer, enum: [3] },
    rangeStartAt: nullable(date),
    rangeEndAt: nullable(date),
    slots: array('ForecastSlot'),
    days: array('ForecastDay'),
    source: ref('WeatherSource'),
  }),
  AlertAvailability: object({
    status: { ...str, enum: ['UNSUPPORTED'] },
    reason: { ...str, enum: ['FREE_PLAN'] },
    message: str,
    alerts: { type: 'array', maxItems: 0, items: { type: 'object' } },
  }),
  Health: object({ status: { ...str, enum: ['ok', 'ready'] } }),
  Pagination: object({
    page: integer,
    pageSize: integer,
    totalItems: integer,
    totalPages: integer,
  }),
  ApiError: object({
    error: object(
      {
        code: str,
        message: str,
        fields: { type: 'array', items: object({ field: str, message: str }) },
      },
      ['code', 'message'],
    ),
    meta: object({ requestId: id }),
  }),
};
const responses: Record<string, [number, string, boolean?]> = {
  'get /auth/csrf': [200, 'CsrfResult'],
  'post /auth/register': [201, 'AuthResult'],
  'post /auth/login': [200, 'AuthResult'],
  'post /auth/refresh': [200, 'AuthResult'],
  'post /auth/logout': [204, ''],
  'get /auth/me': [200, 'PublicUser'],
  'patch /users/me': [200, 'PublicUser'],
  'patch /users/me/password': [204, ''],
  'get /weather/search': [200, 'Location', true],
  'get /weather/current': [200, 'CurrentWeather'],
  'get /weather/forecast': [200, 'Forecast'],
  'get /weather/alerts': [200, 'AlertAvailability'],
  'get /favorites': [200, 'Favorite', true],
  'post /favorites': [201, 'Favorite'],
  'delete /favorites/{id}': [204, ''],
  'get /search-history': [200, 'HistoryItem', true],
  'post /search-history': [200, 'HistoryItem'],
  'delete /search-history/{id}': [204, ''],
  'delete /search-history': [204, ''],
  'get /health/live': [200, 'Health'],
  'get /health/ready': [200, 'Health'],
};
export function describeResponses(document: OpenAPIObject) {
  document.components ??= {};
  document.components.schemas = { ...document.components.schemas, ...schemas };
  for (const [path, item] of Object.entries(document.paths)) {
    for (const method of ['get', 'post', 'patch', 'delete'] as const) {
      const operation = item[method];
      if (!operation) continue;
      const relative = path.replace('/api/v1', '');
      const definition = responses[`${method} ${relative}`];
      if (!definition)
        throw new Error(`Missing OpenAPI response: ${method} ${relative}`);
      const [status, name, isArray] = definition;
      const paged =
        method === 'get' &&
        ['/favorites', '/search-history'].includes(relative);
      const meta = object({
        requestId: id,
        ...(paged ? { pagination: ref('Pagination') } : {}),
      });
      operation.responses[status] =
        status === 204
          ? { description: 'Thành công, không có body.' }
          : {
              description: 'Thành công',
              content: {
                'application/json': {
                  schema: object({
                    data: isArray ? array(name) : ref(name),
                    meta,
                  }),
                },
              },
            };
      for (const code of [
        400, 401, 403, 404, 409, 413, 415, 429, 500, 502, 503, 504,
      ])
        operation.responses[code] = {
          description:
            'Lỗi chuẩn hóa; code xác định nguyên nhân. Xem API contract.',
          content: { 'application/json': { schema: ref('ApiError') } },
          ...(code === 429 || code === 503
            ? {
                headers: {
                  'Retry-After': {
                    description: 'Có khi bị giới hạn request, đơn vị giây.',
                    schema: integer,
                  },
                },
              }
            : {}),
        };
      if (method !== 'get') {
        operation.parameters = (operation.parameters ?? []).filter(
          (p) => !('name' in p) || p.name !== 'X-CSRF-Token',
        );
        operation.parameters.push({
          in: 'header',
          name: 'X-CSRF-Token',
          required: true,
          schema: str,
          description:
            'Lấy từ /auth/csrf hoặc response đăng nhập. Cookie được trình duyệt gửi tự động.',
        });
        operation.description = `${operation.description ?? ''}\nOrigin phải khớp APP_ORIGIN. Khi dùng Vite proxy, mở Swagger tại http://127.0.0.1:5173/api/docs để trình duyệt gửi đúng Origin.`;
      }
    }
  }
  return document;
}
