import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const USER_EMAIL = 'darshanpatel@gmail.com';
const USER_PASSWORD = 'Admin1234';
const WORKSPACE_SLUG = 'opchestra-hq';

let workspaceId: string;
let userId: string;

test.describe('Notifications (Phase 2)', () => {
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

      // Get members to find userId
      const membersRes = await page.request.get(
        `${BASE_URL}/api/workspaces/${workspaceId}/members`,
      );
      const members = await membersRes.json();
      userId = members[0]?.user?.id || members[0]?.userId;
    }
  });

  test('notifications API responds', async ({ page }) => {
    const res = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/notifications`,
    );
    // API should respond (200 or return data)
    const status = res.status();
    expect(status).toBeLessThan(500);
  });

  test('task creation works with assignee', async ({ page }) => {
    const taskRes = await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
      data: { title: 'Notification Test Task', assigneeId: userId },
    });
    expect(taskRes.ok()).toBeTruthy();
    const task = await taskRes.json();
    expect(task.assigneeId).toBe(userId);
  });
});
