import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const origin = 'http://127.0.0.1:5174';
const localFile = (path) => fileURLToPath(new URL(path, import.meta.url));
async function mutation(context, path, method, data) {
  const csrf = await context.request.get(`${origin}/api/v1/auth/csrf`);
  expect(csrf.status()).toBe(200);
  return context.request.fetch(`${origin}/api/v1${path}`, {
    method,
    data,
    headers: {
      Origin: origin,
      'X-CSRF-Token': (await csrf.json()).data.csrfToken,
    },
  });
}
test('two users, concurrent tab refresh, real database recovery and logout', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const contexts = [],
    emails = [];
  let stopped = false;
  try {
    for (const name of ['Tài khoản A', 'Tài khoản B']) {
      const context = await browser.newContext();
      contexts.push(context);
      const email = `weather-e2e-${randomUUID()}@example.invalid`;
      emails.push(email);
      const password = randomUUID();
      execFileSync(
        process.execPath,
        [localFile('../../backend/test/create-ui-user.mjs')],
        {
          input: JSON.stringify({ email, password, displayName: name }),
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );
      const login = await mutation(context, '/auth/login', 'POST', {
        email,
        password,
      });
      expect(login.status()).toBe(200);
    }
    const [a, b] = contexts;
    const location = {
      name: 'Hà Nội',
      country: 'VN',
      latitude: 21.0283,
      longitude: 105.8542,
    };
    const favorite = await mutation(a, '/favorites', 'POST', location);
    const history = await mutation(a, '/search-history', 'POST', location);
    expect(favorite.status()).toBe(201);
    expect(history.status()).toBe(200);
    const favoriteId = (await favorite.json()).data.id;
    const historyId = (await history.json()).data.id;
    expect(
      (await mutation(b, `/favorites/${favoriteId}`, 'DELETE')).status(),
    ).toBe(404);
    expect(
      (await mutation(b, `/search-history/${historyId}`, 'DELETE')).status(),
    ).toBe(404);
    const pageA = await a.newPage(),
      pageB = await b.newPage();
    await pageA.goto(origin);
    await expect(pageA.locator('.place-select')).toHaveCount(2);
    await pageB.goto(origin);
    await expect(
      pageB.getByText('Nhấn ngôi sao ở địa điểm đang xem để lưu tại đây.'),
    ).toBeVisible();
    await expect(pageB.locator('.place-select')).toHaveCount(0);
    const cookies = await a.cookies();
    expect(
      cookies
        .filter((c) => c.name.startsWith('wa-'))
        .every((c) => c.httpOnly && c.sameSite === 'Lax'),
    ).toBe(true);
    expect(await pageA.evaluate(() => Object.keys(localStorage))).not.toEqual(
      expect.arrayContaining(['accessToken', 'refreshToken']),
    );
    const tab = await a.newPage();
    await tab.goto(`${origin}/tai-khoan`);
    await expect(tab.getByLabel('Tên hiển thị', { exact: true })).toHaveValue(
      'Tài khoản A',
    );
    let refreshes = 0;
    a.on('request', (req) => {
      if (req.url().endsWith('/auth/refresh') && req.method() === 'POST')
        refreshes++;
    });
    // Remove only the short-lived cookie to exercise the normal refresh path.
    await a.clearCookies({ name: 'wa-access' });
    await Promise.all([pageA.reload(), tab.reload()]);
    await expect(pageA.locator('.place-select')).toHaveCount(2);
    await expect(tab.getByLabel('Tên hiển thị', { exact: true })).toHaveValue(
      'Tài khoản A',
    );
    expect(refreshes).toBe(1);
    for (const width of [320, 768]) {
      await tab.setViewportSize({ width, height: 900 });
      expect(
        await tab.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    }
    if (process.env.PHASE6_DB_OUTAGE === '1') {
      stopped = true;
      execFileSync(
        'pwsh',
        ['-File', localFile('../../scripts/stop-local-db.ps1')],
        { stdio: 'pipe' },
      );
      expect(
        (await a.request.get(`${origin}/api/v1/health/live`)).status(),
      ).toBe(200);
      const ready = await a.request.get(`${origin}/api/v1/health/ready`);
      expect(ready.status()).toBe(503);
      expect((await ready.json()).error.code).toBe('DATABASE_UNAVAILABLE');
      await tab.reload();
      await expect(
        tab.getByRole('alert').filter({ hasText: 'tạm gián đoạn' }),
      ).toBeVisible();
      await expect(tab).toHaveURL(`${origin}/tai-khoan`);
      execFileSync(
        'pwsh',
        ['-File', localFile('../../scripts/start-local-db.ps1')],
        { stdio: 'pipe' },
      );
      stopped = false;
      await tab.getByRole('button', { name: 'Thử lại', exact: true }).click();
      await expect(tab.getByLabel('Tên hiển thị', { exact: true })).toHaveValue(
        'Tài khoản A',
      );
      expect(
        (await a.request.get(`${origin}/api/v1/health/ready`)).status(),
      ).toBe(200);
    }
    await tab.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await pageA.bringToFront();
    await expect(pageA.locator('.place-select')).toHaveCount(0);
    await expect(
      pageA.getByRole('link', { name: 'Đăng nhập để lưu' }),
    ).toBeVisible();
  } finally {
    if (stopped)
      execFileSync(
        'pwsh',
        ['-File', localFile('../../scripts/start-local-db.ps1')],
        { stdio: 'pipe' },
      );
    for (const context of contexts) await context.close();
    for (const email of emails)
      execFileSync(
        process.execPath,
        [localFile('../../backend/test/cleanup-ui-user.mjs'), email],
        { stdio: 'pipe' },
      );
  }
});
