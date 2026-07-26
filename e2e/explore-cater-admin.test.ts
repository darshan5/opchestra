import { expect, test } from '@playwright/test';

const CATER_URL = 'https://cater.app';
const ADMIN_EMAIL = 'admin@cater.app';
const ADMIN_PASSWORD = 'testcr1234';

test.describe('Explore Cater.app Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${CATER_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });
  });

  test('screenshot admin dashboard', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-dashboard.png', fullPage: true });
  });

  test('screenshot admin users page', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin/users`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-users.png', fullPage: true });
  });

  test('screenshot admin settings page', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin/settings`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-settings.png', fullPage: true });
  });

  test('screenshot admin admin-users page', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin/admin-users`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-admin-users.png', fullPage: true });
  });

  test('screenshot admin logs page', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin/logs`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-logs.png', fullPage: true });
  });

  test('screenshot admin support page', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin/support`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-support.png', fullPage: true });
  });

  test('screenshot admin discounts page', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin/discounts`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-discounts.png', fullPage: true });
  });

  test('screenshot admin reports page', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin/reports`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-reports.png', fullPage: true });
  });

  test('screenshot admin provisioning page', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin/provisioning`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/cater-admin-provisioning.png', fullPage: true });
  });

  test('capture sidebar and layout structure', async ({ page }) => {
    await page.goto(`${CATER_URL}/admin`);
    await page.waitForTimeout(2000);

    // Read the sidebar structure
    const sidebar = await page.locator('nav, aside, [class*="sidebar"]').first();
    const links = await sidebar.locator('a').allTextContents();
    console.log('Sidebar links:', JSON.stringify(links));

    // Read all h1/h2 headings
    const headings = await page.locator('h1, h2').allTextContents();
    console.log('Headings:', JSON.stringify(headings));

    // Get metric card values
    const cards = await page
      .locator('[class*="card"], [class*="metric"], [class*="Card"]')
      .allTextContents();
    console.log('Cards:', JSON.stringify(cards.slice(0, 10)));
  });
});
