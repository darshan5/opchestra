import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const USER_EMAIL = 'darshanpatel@gmail.com';
const USER_PASSWORD = 'Admin1234';
const WORKSPACE_SLUG = 'opchestra-hq';

let workspaceId: string;

test.describe('Custom Fields (Phase 3a)', () => {
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

  test('create custom field definition via API', async ({ page }) => {
    const res = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/custom-fields`,
      { data: { name: `Test Field ${Date.now()}`, type: 'TEXT', config: {} } },
    );
    expect(res.ok()).toBeTruthy();
    const field = await res.json();
    expect(field.name).toContain('Test Field');
    expect(field.type).toBe('TEXT');
  });

  test('list custom fields', async ({ page }) => {
    const res = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/custom-fields`,
    );
    expect(res.ok()).toBeTruthy();
    const fields = await res.json();
    expect(Array.isArray(fields)).toBeTruthy();
  });

  test('set and get field values on a task', async ({ page }) => {
    // Create field
    const fieldRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/custom-fields`,
      { data: { name: `Value Field ${Date.now()}`, type: 'TEXT', config: {} } },
    );
    const field = await fieldRes.json();

    // Create task
    const taskRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks`,
      { data: { title: 'Custom Field Task' } },
    );
    const task = await taskRes.json();

    // Set field value
    const putRes = await page.request.put(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}/field-values`,
      { data: { fieldId: field.id, value: 'Hello World' } },
    );
    expect(putRes.ok()).toBeTruthy();

    // Get field values
    const getRes = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}/field-values`,
    );
    expect(getRes.ok()).toBeTruthy();
  });

  test('custom fields settings page loads', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/settings/custom-fields`);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });
});
