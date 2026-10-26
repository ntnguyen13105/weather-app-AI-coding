import { test, expect } from '@playwright/test';
test('real weather, units, keyboard search and responsive layout', async ({
  page,
}) => {
  test.setTimeout(120000);
  // Account/security scenarios share this server's IP budget. Start the weather
  // scenario in a fresh 60-second window; do not weaken production rate limits.
  await new Promise((resolve) => setTimeout(resolve, 60000));
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const search = page.getByRole('combobox').first();
  const response = page.waitForResponse((r) =>
    r.url().includes('/weather/search?'),
  );
  await search.fill('Ha Noi');
  const searchResponse = await response;
  if (searchResponse.status() === 429) {
    const seconds = Number(searchResponse.headers()['retry-after']);
    expect(seconds).toBeGreaterThan(0);
    expect(seconds).toBeLessThanOrEqual(60);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    await page.reload();
    await search.fill('Ha Noi');
  } else expect(searchResponse.status()).toBe(200);
  await expect(page.getByRole('option').first()).toBeVisible({
    timeout: 15000,
  });
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.locator('.main-temperature')).toBeVisible({
    timeout: 15000,
  });
  const original = await page.locator('.main-temperature').innerText();
  await page.getByRole('button', { name: '°F', exact: true }).click();
  await expect(page.locator('.main-temperature')).not.toHaveText(original);
  await page.getByRole('button', { name: '°C', exact: true }).click();
  await expect(page.locator('.main-temperature')).toHaveText(original);
  await expect(page.locator('.timeline')).toBeVisible({ timeout: 15000 });
  for (const width of [1440, 768, 360, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      actual: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll('body *')]
        .filter(
          (e) =>
            e.getBoundingClientRect().right > innerWidth &&
            getComputedStyle(e).position !== 'absolute',
        )
        .slice(0, 12)
        .map((e) => e.className),
    }));
    expect(geometry, JSON.stringify(geometry)).toMatchObject({
      width,
      actual: width,
    });
    await page.screenshot({
      path: `test-results/weather-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
