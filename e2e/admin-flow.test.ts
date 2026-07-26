import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';
const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';

test.describe('SaaS Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login via admin login page
    await page.goto('/admin-login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
  });

  test('admin dashboard loads with stats', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
    await expect(page.getByText('Total Tasks')).toBeVisible();
  });

  test('admin settings page loads', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Platform Settings' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Public Signup')).toBeVisible();
  });

  test('disable signups via admin toggle', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByText('Public Signup')).toBeVisible({ timeout: 10000 });

    const toggle = page.getByTestId('signup-toggle');
    await toggle.click();
    await expect(page.getByText(/disabled/i)).toBeVisible({ timeout: 10000 });

    // Verify signup is blocked
    const signupRes = await page.request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: 'blocked@test.com', name: 'Blocked', password: 'TestPass123' },
    });
    expect(signupRes.status()).toBe(403);

    // Re-enable signups
    await toggle.click();
    await expect(page.getByText(/enabled/i)).toBeVisible({ timeout: 10000 });
  });

  test('admin sidebar navigation works', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('link', { name: 'Platform Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Platform Settings' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('link', { name: 'Workspaces' }).click();
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('admin users page loads', async ({ page }) => {
    await page.goto('/admin/admin-users');
    await expect(page.getByRole('heading', { name: 'Admin Users' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('audit logs page loads', async ({ page }) => {
    await page.goto('/admin/logs');
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible({
      timeout: 10000,
    });
  });
});
