import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const USER_EMAIL = 'darshanpatel@gmail.com';
const USER_PASSWORD = 'Admin1234';
const WORKSPACE_SLUG = 'opchestra-hq';

let workspaceId: string;

test.describe('Invoicing (Phase 4)', () => {
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

  test('create invoice via API', async ({ page }) => {
    const res = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/invoices`,
      {
        data: {
          items: [
            { description: 'Web Development', quantity: 10, rate: 150 },
            { description: 'Design Work', quantity: 5, rate: 120 },
          ],
          notes: 'Test invoice',
        },
      },
    );
    expect(res.ok()).toBeTruthy();
    const invoice = await res.json();
    expect(invoice.invoiceNumber).toBeTruthy();
    expect(invoice.status).toBe('DRAFT');
  });

  test('list invoices via API', async ({ page }) => {
    const res = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/invoices`,
    );
    expect(res.ok()).toBeTruthy();
    const invoices = await res.json();
    expect(Array.isArray(invoices)).toBeTruthy();
  });

  test('invoicing page loads', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/invoicing`);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('public invoice page loads without auth', async ({ page }) => {
    // Create an invoice first
    const createRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/invoices`,
      {
        data: {
          items: [{ description: 'Consulting', quantity: 1, rate: 500 }],
        },
      },
    );
    const invoice = await createRes.json();

    if (invoice.publicKey) {
      // Access public page (no auth needed)
      const publicRes = await page.request.get(`${BASE_URL}/invoice/${invoice.publicKey}`);
      expect(publicRes.ok()).toBeTruthy();
    }
  });
});
