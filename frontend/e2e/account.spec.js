import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
test('account, persisted favorites, history, profile and password', async ({
  page,
}) => {
  const email = `weather-e2e-${randomUUID()}@example.invalid`;
  const password = randomUUID();
  try {
    await page.goto('/dang-ky');
    await page
      .getByLabel('Tên hiển thị', { exact: true })
      .fill('Kiểm thử giao diện');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByLabel('Xác nhận mật khẩu', { exact: true }).fill(password);
    await page
      .getByRole('button', { name: 'Tạo tài khoản', exact: true })
      .click();
    await expect(page).toHaveURL('/');
    await page.getByRole('combobox').first().fill('Ha Noi');
    await page.getByRole('option').first().click();
    await page
      .getByRole('button', { name: 'Lưu địa điểm yêu thích', exact: true })
      .click();
    await expect(
      page.getByRole('button', {
        name: 'Bỏ yêu thích địa điểm này',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page
        .locator('.places')
        .filter({ hasText: 'Tìm kiếm gần đây' })
        .locator('.place-select'),
    ).toHaveCount(1);
    await page.getByRole('button', { name: '°F', exact: true }).click();
    await expect(
      page.getByRole('button', { name: '°F', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/tai-khoan');
    await page
      .getByLabel('Tên hiển thị', { exact: true })
      .fill('Tên đã cập nhật');
    await page
      .getByRole('button', { name: 'Lưu thay đổi', exact: true })
      .click();
    await expect(page.getByText('Đã lưu thông tin của bạn.')).toBeVisible();
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.goto('/dang-nhap');
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('button', { name: '°F', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page
      .locator('.places')
      .filter({ hasText: 'Địa điểm yêu thích' })
      .locator('.place-select')
      .click();
    await page
      .getByRole('button', { name: 'Bỏ yêu thích địa điểm này', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Lưu địa điểm yêu thích', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Xóa toàn bộ lịch sử', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Xóa lịch sử', exact: true })
      .click();
    await expect(
      page
        .locator('.places')
        .filter({ hasText: 'Tìm kiếm gần đây' })
        .locator('.place-select'),
    ).toHaveCount(0);
    await page.goto('/tai-khoan');
    await expect(page.getByLabel('Tên hiển thị', { exact: true })).toHaveValue(
      'Tên đã cập nhật',
    );
    await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(password);
    await page
      .getByLabel('Mật khẩu mới', { exact: true })
      .fill(`${password}-new`);
    await page
      .getByLabel('Xác nhận mật khẩu mới', { exact: true })
      .fill(`${password}-new`);
    await page
      .getByRole('button', { name: 'Đổi mật khẩu', exact: true })
      .click();
    await expect(page).toHaveURL('/dang-nhap');
  } finally {
    execFileSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('../../backend/test/cleanup-ui-user.mjs', import.meta.url),
        ),
        email,
      ],
      { stdio: 'pipe' },
    );
  }
});
