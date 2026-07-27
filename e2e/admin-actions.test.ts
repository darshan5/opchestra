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

  test('toggle signup and verify API enforcement', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Public Signup')).toBeVisible({ timeout: 15000 });

    // Wait for settings to fully load
    await page.waitForTimeout(2000);

    // Disable signup
    const toggle = page.getByTestId('signup-toggle');
    await toggle.click();
    await page.waitForTimeout(2000);

    // Verify API blocks signup
    const res = await page.request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: `block-${Date.now()}@test.com`, name: 'Blocked', password: 'TestPass123' },
    });
    expect(res.status()).toBe(403);

    // Re-enable immediately to avoid interfering with other tests
    await toggle.click();
    await page.waitForTimeout(1500);

    // Verify signup works again
    const res2 = await page.request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: `unblock-${Date.now()}@test.com`, name: 'Unblocked', password: 'TestPass123' },
    });
    expect(res2.status()).not.toBe(403);
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
