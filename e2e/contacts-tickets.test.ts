import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const USER_EMAIL = 'darshanpatel@gmail.com';
const USER_PASSWORD = 'Admin1234';
const WORKSPACE_SLUG = 'opchestra-hq';

let workspaceId: string;

test.describe('Contacts & Tickets (Phase 3b)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(USER_EMAIL);
    await page.getByLabel('Password').fill(USER_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });

    if (!workspaceId) {
      const wsRes = await page.request.get(`${BASE_URL}/api/workspaces`);
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === WORKSPACE_SLUG);
      workspaceId = ws?.id;
    }
  });

  test('create company via API', async ({ page }) => {
    const res = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/companies`,
      { data: { name: `Test Corp ${Date.now()}`, domain: 'testcorp.com', industry: 'Technology' } },
    );
    expect(res.ok()).toBeTruthy();
    const company = await res.json();
    expect(company.name).toContain('Test Corp');
  });

  test('create contact linked to company', async ({ page }) => {
    // Create company
    const compRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/companies`,
      { data: { name: `Contact Corp ${Date.now()}` } },
    );
    const company = await compRes.json();

    // Create contact
    const res = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/contacts`,
      {
        data: {
          name: 'John Doe',
          email: `john${Date.now()}@test.com`,
          companyId: company.id,
          title: 'CEO',
        },
      },
    );
    expect(res.ok()).toBeTruthy();
    const contact = await res.json();
    expect(contact.name).toBe('John Doe');
  });

  test('create ticket with auto-generated number', async ({ page }) => {
    const res = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tickets`,
      { data: { title: 'Test Ticket', priority: 'HIGH' } },
    );
    expect(res.ok()).toBeTruthy();
    const ticket = await res.json();
    expect(ticket.ticketNumber).toBeTruthy();
  });

  test('tickets page loads', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/tickets`);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('contacts page loads', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/contacts`);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('public ticket submission form loads', async ({ page }) => {
    const res = await page.request.get(`${BASE_URL}/submit/${WORKSPACE_SLUG}`);
    expect(res.ok()).toBeTruthy();
  });
});
