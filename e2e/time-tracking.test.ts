import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const USER_EMAIL = 'darshanpatel@gmail.com';
const USER_PASSWORD = 'Admin1234';
const WORKSPACE_SLUG = 'opchestra-hq';

let workspaceId: string;

test.describe('Time Tracking (Phase 2)', () => {
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

  test('create and retrieve time entry via API', async ({ page }) => {
    // Create task
    const taskRes = await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
      data: { title: 'Time Track Task' },
    });
    const task = await taskRes.json();

    // Create time entry
    const entryRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}/time-entries`,
      {
        data: {
          duration: 60,
          date: new Date().toISOString(),
          notes: 'Test entry',
          billable: true,
        },
      },
    );
    expect(entryRes.ok()).toBeTruthy();
    const entry = await entryRes.json();
    expect(entry.duration).toBe(60);
    expect(entry.notes).toBe('Test entry');

    // Get time entries
    const listRes = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}/time-entries`,
    );
    expect(listRes.ok()).toBeTruthy();
    const entries = await listRes.json();
    expect(Array.isArray(entries) ? entries.length : Object.keys(entries).length).toBeGreaterThan(0);
  });

  test('time tracking page loads', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/time-tracking`);
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });
});
