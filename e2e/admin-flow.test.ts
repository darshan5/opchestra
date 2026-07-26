import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';

test.describe('SaaS Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });
  });

  test('admin dashboard loads with stats', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Workspaces' })).toBeVisible();
    await expect(page.getByText('Total Tasks')).toBeVisible();
  });

  test('admin settings page loads', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Platform Settings' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Public Signup')).toBeVisible();
    await expect(page.getByText('Email (Resend)')).toBeVisible();
  });

  test('disable signups via admin toggle', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByText('Public Signup')).toBeVisible({ timeout: 10000 });

    // Click the toggle to disable signups
    const toggle = page.getByTestId('signup-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();

    // Wait for confirmation message
    await expect(page.getByText('Signup disabled')).toBeVisible({ timeout: 10000 });

    // Verify signup is blocked
    const signupRes = await page.request.post('/api/auth/signup', {
      data: { email: 'blocked@test.com', name: 'Blocked', password: 'TestPass123' },
    });
    expect(signupRes.status()).toBe(403);
    const body = await signupRes.json();
    expect(body.error).toContain('disabled');

    // Re-enable signups
    await toggle.click();
    await expect(page.getByText('Signup enabled')).toBeVisible({ timeout: 10000 });
  });

  test('admin sidebar navigation works', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 10000 });

    // Navigate to settings via sidebar
    await page.getByRole('link', { name: 'Platform Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Platform Settings' })).toBeVisible({ timeout: 10000 });

    // Navigate back to workspaces
    await page.getByRole('link', { name: 'Workspaces' }).click();
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test('admin can access app via link', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 10000 });

    // Click "App" link in sidebar
    await page.getByRole('link', { name: 'App' }).click();
    await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
  });
});
