import { type Page } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';

export const TEST_USER = {
  email: `e2etest+${Date.now()}@opchestra.com`,
  name: 'E2E Test User',
  password: 'TestPass123',
};

export async function signupUser(page: Page, user = TEST_USER) {
  const res = await page.request.post(`${BASE_URL}/api/auth/signup`, {
    data: { email: user.email, name: user.name, password: user.password },
  });
  return res.json();
}

export async function verifyUserDirectly(page: Page, email: string) {
  const res = await page.request.post(`${BASE_URL}/api/setup/verify-test-user`, {
    data: { email },
  });
  return res;
}

export async function loginUser(page: Page, user = TEST_USER) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
