import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';

test.describe.serial('Admin Actions (sequential)', () => {
  test('1. Login as SaaS admin via admin-login', async ({ page }) => {
    await page.goto('/admin-login');
    await expect(page.getByText(/admin/i)).toBeVisible();
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({
      timeout: 10000,
    });
    await page.screenshot({ path: 'test-results/admin-dashboard.png' });
  });

  test('2. Disable signups via admin settings', async ({ page }) => {
    await page.goto('/admin-login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto('/admin/settings');
    await expect(page.getByText('Public Signup')).toBeVisible({ timeout: 10000 });

    const toggle = page.getByTestId('signup-toggle');
    await toggle.click();
    await expect(page.getByText(/disabled/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/signup-disabled.png' });

    // Verify signup blocked
    const res = await page.request.post('/api/auth/signup', {
      data: { email: 'shouldfail@test.com', name: 'Should Fail', password: 'TestPass123' },
    });
    expect(res.status()).toBe(403);

    // Re-enable
    await toggle.click();
    await expect(page.getByText(/enabled/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/signup-re-enabled.png' });
  });

  test('3. Admin login page rejects non-admin users', async ({ page }) => {
    // Try to login with a workspace user (not an admin)
    await page.goto('/admin-login');
    await page.getByLabel('Email').fill('random@test.com');
    await page.getByLabel('Password').fill('TestPass123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText(/invalid|access|error/i)).toBeVisible({ timeout: 10000 });
  });
});
