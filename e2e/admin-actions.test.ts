import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';

test.describe.serial('Admin Actions (sequential)', () => {
  test('1. Login as SaaS admin', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });

    // Navigate to admin
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({
      timeout: 10000,
    });

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-dashboard.png' });
  });

  test('2. Disable signups via admin settings', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });

    // Go to admin settings
    await page.goto('/admin/settings');
    await expect(page.getByText('Public Signup')).toBeVisible({ timeout: 10000 });

    // Disable signups
    const toggle = page.getByTestId('signup-toggle');
    await toggle.click();
    await expect(page.getByText(/[Ss]ignup disabled/)).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/signup-disabled.png' });

    // Verify signup is blocked
    const res = await page.request.post('/api/auth/signup', {
      data: { email: 'shouldfail@test.com', name: 'Should Fail', password: 'TestPass123' },
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('disabled');

    // Verify signup page shows error
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('Blocked User');
    await page.getByLabel('Email').fill('blocked@test.com');
    await page.getByLabel('Password').fill('TestPass123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('disabled')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/signup-blocked-page.png' });
  });

  test('3. Create workspace and admin account', async ({ page }) => {
    // Login as SaaS admin
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });

    // Create a workspace for the admin
    const wsSlug = `admin-ws-${Date.now()}`;
    await page.goto('/app/onboarding');
    await page.getByLabel('Workspace name').fill('Admin Workspace');
    await page.getByLabel('URL').clear();
    await page.getByLabel('URL').fill(wsSlug);
    await page.getByRole('button', { name: 'Create workspace' }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${wsSlug}`), { timeout: 15000 });

    await page.screenshot({ path: 'test-results/workspace-created.png' });

    // Verify workspace home loads
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
    await expect(page.getByText('Welcome back')).toBeVisible();

    await page.screenshot({ path: 'test-results/workspace-home.png' });
  });

  test('4. Re-enable signups', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });

    // Re-enable signups
    await page.goto('/admin/settings');
    await expect(page.getByText('Public Signup')).toBeVisible({ timeout: 10000 });

    const toggle = page.getByTestId('signup-toggle');
    await toggle.click();
    await expect(page.getByText(/[Ss]ignup enabled/)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/signup-re-enabled.png' });
  });
});
