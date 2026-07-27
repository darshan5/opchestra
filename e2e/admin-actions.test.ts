import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';

test.describe.serial('Admin Actions (sequential)', () => {
  test('1. Login as SaaS admin via admin-login', async ({ page }) => {
    await page.goto('/admin-login');
    await expect(page.getByText('Admin Sign In')).toBeVisible({ timeout: 10000 });
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-dashboard.png' });
  });

  test('2. Disable signups via admin settings', async ({ page }) => {
    await page.goto('/admin-login');
    await expect(page.getByText('Admin Sign In')).toBeVisible({ timeout: 10000 });
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto('/admin/settings');
    await expect(page.getByText('Public Signup')).toBeVisible({ timeout: 10000 });

    const toggle = page.getByTestId('signup-toggle');
    await toggle.click();
    await expect(page.getByText(/disabled/i)).toBeVisible({ timeout: 10000 });

    const res = await page.request.post('/api/auth/signup', {
      data: { email: 'shouldfail@test.com', name: 'Should Fail', password: 'TestPass123' },
    });
    expect(res.status()).toBe(403);

    await toggle.click();
    await expect(page.getByText(/enabled/i)).toBeVisible({ timeout: 10000 });
  });

  test('3. Admin login rejects non-admin', async ({ page }) => {
    await page.goto('/admin-login');
    await expect(page.getByText('Admin Sign In')).toBeVisible({ timeout: 10000 });
    await page.fill('#email', 'random@test.com');
    await page.fill('#password', 'TestPass123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|error|access/i)).toBeVisible({ timeout: 10000 });
  });
});
