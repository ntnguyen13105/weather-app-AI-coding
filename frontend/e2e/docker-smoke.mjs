import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const email = `docker-smoke-${randomUUID()}@example.invalid`;
const password = randomUUID();
const secure = process.env.SMOKE_HTTPS === '1';
const origin = secure ? 'https://localhost:8443' : 'http://localhost:8080';
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ ignoreHTTPSErrors: secure });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto(`${origin}/dang-ky`);
  assert.equal(response.status(), 200);
  assert.match(
    response.headers()['content-security-policy'],
    /default-src 'self'/,
  );
  await page
    .getByLabel('Tên hiển thị', { exact: true })
    .fill('Kiểm thử Docker');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(password);
  await page
    .getByRole('button', { name: 'Tạo tài khoản', exact: true })
    .click();
  await page.waitForURL(`${origin}/`);
  const cookies = await context.cookies();
  assert.equal(
    cookies.filter(
      (c) => c.name.endsWith('wa-access') || c.name.endsWith('wa-refresh'),
    ).length,
    2,
  );
  assert(cookies.every((c) => c.httpOnly && c.sameSite === 'Lax'));
  if (secure) {
    assert(cookies.every((c) => c.secure && c.name.startsWith('__Host-')));
    assert(response.headers()['strict-transport-security']);
    assert.equal(
      (await context.request.get(`${origin}/api/docs-json`)).status(),
      404,
    );
  }
  const search = page.getByRole('combobox').first();
  await search.fill('Ha Noi');
  await page.getByRole('option').first().click();
  await page.locator('.main-temperature').waitFor();
  await page.locator('.timeline').waitFor();
  await page
    .getByRole('button', { name: 'Lưu địa điểm yêu thích', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Bỏ yêu thích địa điểm này', exact: true })
    .waitFor();
  await page.reload();
  await page
    .locator('.places')
    .filter({ hasText: 'Địa điểm yêu thích' })
    .locator('.place-select')
    .waitFor();
  assert.equal(
    await page
      .locator('.places')
      .filter({ hasText: 'Địa điểm yêu thích' })
      .locator('.place-select')
      .count(),
    1,
  );
  await page.goto(`${origin}/tai-khoan`);
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.waitForURL(`${origin}/dang-nhap`);
  await page.goto(`${origin}/`);
  await page.getByRole('link', { name: 'Đăng nhập để lưu' }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'PASS Docker: SPA deep link, CSP, register, real weather/forecast, persistent favorite, logout; no JS errors.',
  );
} finally {
  await browser.close();
  const script = `const {PrismaClient}=await import('./dist/generated/prisma/client.js');const {PrismaPg}=await import('@prisma/adapter-pg');const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});try{await db.user.deleteMany({where:{email:process.argv[1]}});}finally{await db.$disconnect();}`;
  execFileSync(
    'docker',
    [
      'compose',
      '--env-file',
      '.env.docker',
      'exec',
      '-T',
      'backend',
      'node',
      '--input-type=module',
      '-e',
      script,
      email,
    ],
    { cwd: root, stdio: 'pipe' },
  );
}
