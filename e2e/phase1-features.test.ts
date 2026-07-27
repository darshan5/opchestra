import { expect, test } from '@playwright/test';

import { TEST_USER } from './helpers';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';

let workspaceSlug: string;
let workspaceId: string;
let projectId: string;

test.describe('Phase 1 Features', () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: TEST_USER.email, name: TEST_USER.name, password: TEST_USER.password },
    });
    await request.post(`${BASE_URL}/api/setup/verify-test-user`, {
      data: { email: TEST_USER.email },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });

    if (!workspaceSlug) {
      const slug = `phase1-${Date.now()}`;
      const res = await page.request.post(`${BASE_URL}/api/workspaces`, {
        data: { name: 'Phase 1 Test', slug },
      });
      const ws = await res.json();
      workspaceSlug = ws.slug || slug;
      workspaceId = ws.id;

      const projRes = await page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/projects`,
        { data: { name: 'Test Project' } },
      );
      const proj = await projRes.json();
      projectId = proj.id;
    }
  });

  test('task detail panel opens on click', async ({ page }) => {
    if (!workspaceId || !projectId) {
      test.skip();
      return;
    }

    await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
      data: { title: 'Clickable Task', projectId, priority: 'HIGH' },
    });

    await page.goto(`/app/${workspaceSlug}/projects/${projectId}`);
    await expect(page.getByText('Clickable Task')).toBeVisible({ timeout: 10000 });

    await page.getByText('Clickable Task').click();

    // Panel should open with task title
    await expect(page.getByRole('heading', { name: 'Clickable Task' }).or(
      page.locator('[class*="panel"]').getByText('Clickable Task')
    )).toBeVisible({ timeout: 10000 });
  });

  test('task detail panel has tabs', async ({ page }) => {
    if (!workspaceId || !projectId) {
      test.skip();
      return;
    }

    await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
      data: { title: 'Tabbed Task', projectId },
    });

    await page.goto(`/app/${workspaceSlug}/projects/${projectId}`);
    await page.getByText('Tabbed Task').click();

    await expect(page.getByText('Details').or(page.getByRole('tab', { name: 'Details' }))).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Activity').or(page.getByRole('tab', { name: 'Activity' }))).toBeVisible();
  });

  test('workspace settings page loads', async ({ page }) => {
    await page.goto(`/app/${workspaceSlug}/settings`);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 });
  });

  test('activity log created on status change', async ({ page }) => {
    if (!workspaceId) {
      test.skip();
      return;
    }

    const task = await (
      await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Activity Test Task' },
      })
    ).json();

    // Change status
    await page.request.patch(`${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}`, {
      data: { status: 'In Progress' },
    });

    // Check comments for activity
    const commentsRes = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}/comments`,
    );
    const comments = await commentsRes.json();

    const systemComment = comments.find(
      (c: { content: { type?: string } }) => c.content?.type === 'system',
    );
    expect(systemComment).toBeTruthy();
    expect(systemComment.content.text).toContain('changed status');
  });

  test('my-tasks page works with projects prop', async ({ page }) => {
    await page.goto(`/app/${workspaceSlug}/my-tasks`);
    await expect(page.getByRole('heading', { name: 'My Tasks' })).toBeVisible({ timeout: 10000 });
  });

  test('project page works with task table', async ({ page }) => {
    if (!projectId) {
      test.skip();
      return;
    }

    await page.goto(`/app/${workspaceSlug}/projects/${projectId}`);
    await expect(page.getByRole('heading', { name: 'Test Project' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByPlaceholder('Add a task...')).toBeVisible();
  });
});
