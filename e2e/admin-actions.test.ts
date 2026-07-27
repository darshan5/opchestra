import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';
const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';

async function adminLogin(page: import('@playwright/test').Page) {
  await page.goto('/admin-login');
  await page.waitForLoadState('networkidle');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!-login)/, { timeout: 15000 });
}

test.describe.serial('Admin Actions (sequential)', () => {
  test('admin login works', async ({ page }) => {
    await adminLogin(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('admin settings page loads', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Public Signup')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Maintenance Mode')).toBeVisible();
    await expect(page.getByText('Disable Login')).toBeVisible();
  });

  test('admin login rejects non-admin', async ({ page }) => {
    await page.goto('/admin-login');
    await page.waitForLoadState('networkidle');
    await page.fill('#email', 'random@test.com');
    await page.fill('#password', 'TestPass123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|error|access/i)).toBeVisible({ timeout: 10000 });
  });
});
