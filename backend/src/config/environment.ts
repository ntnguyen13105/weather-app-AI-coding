import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, Min, validateSync } from 'class-validator';

class Environment {
  @IsIn(['development', 'test', 'production'])
  NODE_ENV: string = 'development';

  @Transform(({ value }: { value: unknown }) =>
    /^\d+$/.test(String(value)) ? Number(value) : NaN,
  )
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  HOST: string = '127.0.0.1';

  @IsString()
  APP_ORIGIN: string = 'http://127.0.0.1:5173';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  OPENWEATHER_API_KEY: string = '';

  @IsString()
  JWT_SECRET: string = '';

  @IsString()
  CSRF_SECRET: string = '';
}

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  // Only copy known keys: process.env contains many unrelated OS settings.
  const keys = [
    'NODE_ENV',
    'PORT',
    'HOST',
    'APP_ORIGIN',
    'DATABASE_URL',
    'OPENWEATHER_API_KEY',
    'JWT_SECRET',
    'CSRF_SECRET',
  ];
  const config = plainToInstance(
    Environment,
    Object.fromEntries(
      keys
        .filter((key) => input[key] !== undefined)
        .map((key) => [key, input[key]]),
    ),
  );
  const invalid = new Set(validateSync(config).map((error) => error.property));
  try {
    const db = new URL(config.DATABASE_URL);
    if (
      !['postgres:', 'postgresql:'].includes(db.protocol) ||
      !db.hostname ||
      !db.username ||
      !db.password ||
      db.pathname.length < 2 ||
      db.password.includes('REPLACE_WITH')
    )
      invalid.add('DATABASE_URL');
  } catch {
    invalid.add('DATABASE_URL');
  }
  try {
    const origin = new URL(config.APP_ORIGIN);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.origin !== config.APP_ORIGIN
    )
      invalid.add('APP_ORIGIN');
    if (config.NODE_ENV === 'production' && origin.protocol !== 'https:')
      invalid.add('APP_ORIGIN');
  } catch {
    invalid.add('APP_ORIGIN');
  }
  if (!config.HOST?.trim()) invalid.add('HOST');
  if (config.NODE_ENV === 'production') {
    for (const key of ['JWT_SECRET', 'CSRF_SECRET'] as const) {
      if (typeof config[key] !== 'string' || config[key].length < 43)
        invalid.add(key);
    }
    if (config.JWT_SECRET === config.CSRF_SECRET) invalid.add('CSRF_SECRET');
    if (!config.OPENWEATHER_API_KEY?.trim()) invalid.add('OPENWEATHER_API_KEY');
  }
  if (invalid.size)
    throw new Error(
      `Cấu hình không hợp lệ: ${[...invalid].join(', ')}. Kiểm tra .env; không gửi secret vào log.`,
    );
  return config;
}
