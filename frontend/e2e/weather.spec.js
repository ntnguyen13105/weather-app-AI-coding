import { test, expect } from '@playwright/test';
test('real weather, units, keyboard search and responsive layout', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const search = page.getByRole('combobox').first();
  await search.fill('Ha Noi');
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
      path: `../docs/screenshots/phase-5-${width}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
