import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { config } from 'dotenv';
config({ path: new URL('../../.env', import.meta.url), quiet: true });
// Only this project's isolated local cluster; never create/drop a production database.
const source = new URL(process.env.DATABASE_URL);
if (
  source.hostname !== '127.0.0.1' ||
  source.port !== '55432' ||
  source.pathname !== '/weather_app'
)
  throw new Error('Test setup chỉ hỗ trợ cluster local dự án trên cổng 55432.');
const credentials = JSON.parse(
  readFileSync(
    new URL('../../.local/db-credentials.json', import.meta.url),
    'utf8',
  ),
);
const admin = new pg.Client({
  host: '127.0.0.1',
  port: 55432,
  user: 'weather_admin',
  password: credentials.adminPassword,
  database: 'postgres',
});
try {
  await admin.connect();
  if (
    !(
      await admin.query(
        "SELECT 1 FROM pg_database WHERE datname = 'weather_app_test'",
      )
    ).rowCount
  )
    await admin.query('CREATE DATABASE weather_app_test OWNER weather_app');
} finally {
  await admin.end();
}
source.pathname = '/weather_app_test';
const env = {
  ...process.env,
  DATABASE_URL: source.href,
  TEST_DATABASE_URL: source.href,
};
for (const [script, args] of [
  ['node_modules/prisma/build/index.js', ['migrate', 'deploy']],
  [
    'node_modules/vitest/vitest.mjs',
    ['run', '--config', 'vitest.integration.config.mjs'],
  ],
]) {
  const result = spawnSync(process.execPath, [script, ...args], {
    env,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
