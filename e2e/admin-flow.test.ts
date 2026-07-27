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

test.describe('SaaS Admin Flow', () => {
  test('admin login and dashboard', async ({ page }) => {
    await adminLogin(page);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('admin settings page', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Platform Settings' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('admin users page', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/admin-users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('audit logs page', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/logs');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('plans page', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/plans');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('support page', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });
});
