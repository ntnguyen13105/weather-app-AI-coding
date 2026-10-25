import { test, expect } from '@playwright/test';

// These tests target guest UI and failure presentation. Live auth is covered
// by account.spec.js and security.spec.js; avoid spending auth quota on reloads.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/auth/**', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'AUTH_REQUIRED' } }),
    }),
  );
});

test('weather errors stay explicit and retry recovers real data', async ({
  page,
}) => {
  await page.route('**/api/v1/weather/current?*', (route) =>
    route.fulfill({
      status: 504,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'WEATHER_TIMEOUT' } }),
    }),
  );
  await page.goto('/');
  await page.getByRole('combobox').first().fill('Ha Noi');
  await page.getByRole('option').first().click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'phản hồi quá chậm' }),
  ).toBeVisible();
  await expect(page.locator('.main-temperature')).toHaveCount(0);
  await expect(page.locator('.timeline')).toBeVisible();
  await page.unroute('**/api/v1/weather/current?*');
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.locator('.main-temperature')).toBeVisible();
  await page.route('**/api/v1/weather/search?*', (route) =>
    route.abort('internetdisconnected'),
  );
  await page.getByRole('combobox').first().fill('Da Nang');
  await expect(page.locator('.search-status')).toContainText(
    'Chưa thể hoàn tất yêu cầu',
  );
  await page.unroute('**/api/v1/weather/search?*');
});

test('guest routes, keyboard and mobile form validation', async ({ page }) => {
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/dang-nhap', '/dang-ky', '/not-found']) {
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      if (width === 320 && path === '/dang-ky')
        await page.screenshot({
          path: 'test-results/register-mobile.png',
          fullPage: true,
        });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(width);
    }
  }
  await page.goto('/tai-khoan');
  await expect(page).toHaveURL('/dang-nhap');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await expect(page.getByText('Nhập email hợp lệ.')).toBeVisible();
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Đến nội dung chính' }),
  ).toBeFocused();
  await page.setViewportSize({ width: 320, height: 900 });
  await expect(
    page.getByRole('link', { name: 'Đăng nhập', exact: true }),
  ).toHaveCount(1);
});
