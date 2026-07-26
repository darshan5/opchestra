import { expect, test } from '@playwright/test';

import { TEST_USER } from './helpers';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const WORKSPACE_SLUG = `test-ws-${Date.now()}`;

test.describe('Workspace flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user exists and is verified
    await page.request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: TEST_USER.email, name: TEST_USER.name, password: TEST_USER.password },
    });
    await page.request.post(`${BASE_URL}/api/setup/verify-test-user`, {
      data: { email: TEST_USER.email },
    });

    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });
  });

  test('onboarding page loads for new user', async ({ page }) => {
    await page.goto('/app/onboarding');
    await expect(page.getByText('Create your workspace')).toBeVisible();
    await expect(page.getByLabel('Workspace name')).toBeVisible();
    await expect(page.getByLabel('URL')).toBeVisible();
  });

  test('create workspace', async ({ page }) => {
    await page.goto('/app/onboarding');
    await page.getByLabel('Workspace name').fill('Test Workspace');
    await page.getByLabel('URL').clear();
    await page.getByLabel('URL').fill(WORKSPACE_SLUG);
    await page.getByRole('button', { name: 'Create workspace' }).click();

    // Should redirect to workspace home
    await expect(page).toHaveURL(new RegExp(`/app/${WORKSPACE_SLUG}`), { timeout: 15000 });
  });

  test('workspace home page loads', async ({ page }) => {
    // First create workspace if needed
    const wsRes = await page.request.post(`${BASE_URL}/api/workspaces`, {
      data: { name: 'Home Test WS', slug: `home-test-${Date.now()}` },
    });
    const ws = await wsRes.json();

    if (ws.slug) {
      await page.goto(`/app/${ws.slug}`);
      await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible();
      await expect(page.getByText('Welcome back')).toBeVisible();
    }
  });

  test('duplicate workspace slug rejected', async ({ page }) => {
    const slug = `dup-test-${Date.now()}`;
    // Create first
    await page.request.post(`${BASE_URL}/api/workspaces`, {
      data: { name: 'First WS', slug },
    });

    // Try duplicate
    await page.goto('/app/onboarding');
    await page.getByLabel('Workspace name').fill('Duplicate WS');
    await page.getByLabel('URL').clear();
    await page.getByLabel('URL').fill(slug);
    await page.getByRole('button', { name: 'Create workspace' }).click();

    await expect(page.getByText('already taken')).toBeVisible({ timeout: 10000 });
  });
});
