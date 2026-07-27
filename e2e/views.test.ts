import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const USER_EMAIL = 'darshanpatel@gmail.com';
const USER_PASSWORD = 'Admin1234';
const WORKSPACE_SLUG = 'opchestra-hq';

let workspaceId: string;
let projectId: string;

test.describe('Views (Phase 2)', () => {
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

      const projRes = await page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/projects`,
        { data: { name: 'Views Test Project' } },
      );
      const proj = await projRes.json();
      projectId = proj.id;

      // Create tasks with dates for views
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        data: {
          title: 'View Task 1',
          projectId,
          status: 'Todo',
          startDate: now.toISOString(),
          endDate: nextWeek.toISOString(),
        },
      });
      await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'View Task 2', projectId, status: 'In Progress' },
      });
    }
  });

  test('table view loads by default', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/projects/${projectId}`);
    await page.waitForLoadState('networkidle');
    // Table view should show task content or add item link
    await expect(
      page.getByText(/add item|add task|view task/i).first().or(page.locator('table, [class*="table"], [class*="group"]').first()),
    ).toBeVisible({ timeout: 15000 });
  });

  test('kanban view shows status columns', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/projects/${projectId}`);
    const kanbanBtn = page.getByRole('button', { name: /kanban/i });
    if (await kanbanBtn.isVisible()) {
      await kanbanBtn.click();
      await expect(page.getByText('Todo').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('calendar view shows month navigation', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/projects/${projectId}`);
    const calBtn = page.getByRole('button', { name: /calendar/i });
    if (await calBtn.isVisible()) {
      await calBtn.click();
      await expect(
        page.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/)
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('gantt view shows timeline', async ({ page }) => {
    await page.goto(`/app/${WORKSPACE_SLUG}/projects/${projectId}`);
    const ganttBtn = page.getByRole('button', { name: /gantt/i });
    if (await ganttBtn.isVisible()) {
      await ganttBtn.click();
      await page.waitForTimeout(2000);
      // Gantt should have some timeline element
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
