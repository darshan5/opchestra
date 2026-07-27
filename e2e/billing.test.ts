import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';
const WORKSPACE_SLUG = 'opchestra-hq';

test.describe('Billing & Plans (Phase 4)', () => {
  test('plans API returns list via admin auth', async ({ request }) => {
    // Login as admin
    const loginRes = await request.post(`${BASE_URL}/api/admin/auth/login`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Get plans
    const plansRes = await request.get(`${BASE_URL}/api/admin/plans`);
    expect(plansRes.ok()).toBeTruthy();
    const plans = await plansRes.json();
    expect(Array.isArray(plans)).toBeTruthy();
  });

  test('admin plans page loads', async ({ page }) => {
    // Login as admin
    await page.goto('/admin-login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto('/admin/plans');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('billing settings page loads', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });

    await page.goto(`/app/${WORKSPACE_SLUG}/settings/billing`);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });
});
