import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';
config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});
const email = process.argv[2];
const database = new URL(process.env.DATABASE_URL);
if (
  !/^weather-e2e-[0-9a-f-]{36}@example\.invalid$/.test(email ?? '') ||
  database.hostname !== '127.0.0.1' ||
  database.port !== '55432' ||
  database.pathname !== '/weather_app'
)
  throw new Error('Chỉ dọn tài khoản E2E trên database local của dự án.');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  await client.query('DELETE FROM "User" WHERE email = $1', [email]);
} finally {
  await client.end();
}
