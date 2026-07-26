import { expect, test } from '@playwright/test';

import { TEST_USER } from './helpers';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';

test.describe('Auth flow', () => {
  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('Create your account')).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Sign in')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByText('Forgot password?')).toBeVisible();
    await expect(page.getByText('Create account')).toBeVisible();
  });

  test('reset password page loads', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText('Reset password')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('signup creates account and shows verification message', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel('Full name').fill(TEST_USER.name);
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(TEST_USER.email)).toBeVisible();
  });

  test('login fails with unverified user', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(
      page.getByText('verify your email').or(page.getByText('Invalid email')),
    ).toBeVisible({ timeout: 10000 });
  });

  test('login succeeds after verification', async ({ page }) => {
    // Verify user via API
    const verifyRes = await page.request.post(`${BASE_URL}/api/setup/verify-test-user`, {
      data: { email: TEST_USER.email },
    });
    expect(verifyRes.ok()).toBeTruthy();

    // Now login
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Should redirect to onboarding (no workspace yet)
    await expect(page).toHaveURL(/\/(app\/onboarding|app)/, { timeout: 15000 });
  });

  test('signup rejects duplicate email', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Full name').fill('Duplicate User');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('already exists')).toBeVisible({ timeout: 10000 });
  });

  test('login fails with wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill('WrongPass123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 10000 });
  });
});
