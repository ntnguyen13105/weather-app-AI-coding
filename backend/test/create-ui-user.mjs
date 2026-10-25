import process from 'node:process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { URL, fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { hash } from 'argon2';
import pg from 'pg';
config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});
const { email, password, displayName } = JSON.parse(readFileSync(0, 'utf8'));
const database = new URL(process.env.DATABASE_URL);
if (
  !/^weather-e2e-[0-9a-f-]{36}@example\.invalid$/.test(email ?? '') ||
  database.hostname !== '127.0.0.1' ||
  database.port !== '55432' ||
  database.pathname !== '/weather_app' ||
  typeof password !== 'string' ||
  password.length < 12
)
  throw new Error('Chỉ tạo fixture E2E trên database local của dự án.');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query(
    'INSERT INTO "User" (id, email, "passwordHash", "displayName", "updatedAt") VALUES ($1, $2, $3, $4, now())',
    [randomUUID(), email, await hash(password), displayName],
  );
} finally {
  await client.end();
}
