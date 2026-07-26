import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';

test.describe('API endpoints', () => {
  test('health check returns healthy', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.db).toBe('connected');
  });

  test('signup API validates input', async ({ request }) => {
    // Missing fields
    const res1 = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: 'bad' },
    });
    expect(res1.status()).toBe(400);

    // Short password
    const res2 = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: 'test@test.com', name: 'Test', password: 'short' },
    });
    expect(res2.status()).toBe(400);

    // No uppercase
    const res3 = await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: 'test@test.com', name: 'Test', password: 'nouppercase1' },
    });
    expect(res3.status()).toBe(400);
  });

  test('workspace API requires auth', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/workspaces`);
    expect(res.status()).toBe(401);
  });

  test('password reset request always returns success', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/auth/reset-password`, {
      data: { email: 'nonexistent@test.com' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.message).toContain('If an account exists');
  });
});
