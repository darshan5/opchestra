import { expect, test } from '@playwright/test';

import { TEST_USER } from './helpers';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';

let workspaceSlug: string;
let workspaceId: string;

test.describe('Projects and Tasks', () => {
  test.beforeAll(async ({ request }) => {
    // Ensure user exists and is verified
    await request.post(`${BASE_URL}/api/auth/signup`, {
      data: { email: TEST_USER.email, name: TEST_USER.name, password: TEST_USER.password },
    });
    await request.post(`${BASE_URL}/api/setup/verify-test-user`, {
      data: { email: TEST_USER.email },
    });
  });

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_USER.email);
    await page.getByLabel('Password').fill(TEST_USER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app/, { timeout: 15000 });

    // Ensure workspace exists
    if (!workspaceSlug) {
      const slug = `proj-test-${Date.now()}`;
      const res = await page.request.post(`${BASE_URL}/api/workspaces`, {
        data: { name: 'Project Test WS', slug },
      });
      const ws = await res.json();
      workspaceSlug = ws.slug || slug;
      workspaceId = ws.id;
    }
  });

  test('new project page loads', async ({ page }) => {
    await page.goto(`/app/${workspaceSlug}/projects/new`);
    await expect(page.getByText('New Project')).toBeVisible();
    await expect(page.getByLabel('Project name')).toBeVisible();
  });

  test('create project via UI', async ({ page }) => {
    await page.goto(`/app/${workspaceSlug}/projects/new`);
    await page.getByLabel('Project name').fill('E2E Test Project');
    await page.getByRole('button', { name: 'Create project' }).click();

    // Should redirect to project page
    await expect(page).toHaveURL(/\/projects\//, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'E2E Test Project' })).toBeVisible();
  });

  test('create project via API and verify page', async ({ page }) => {
    if (!workspaceId) {
      test.skip();
      return;
    }

    const res = await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/projects`, {
      data: { name: 'API Created Project', description: 'Created via API for testing' },
    });
    const project = await res.json();

    expect(res.ok()).toBeTruthy();
    expect(project.name).toBe('API Created Project');

    await page.goto(`/app/${workspaceSlug}/projects/${project.id}`);
    await expect(page.getByRole('heading', { name: 'API Created Project' })).toBeVisible();
  });

  test('create task in project', async ({ page }) => {
    if (!workspaceId) {
      test.skip();
      return;
    }

    // Create a project first
    const projRes = await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/projects`, {
      data: { name: 'Task Test Project' },
    });
    const project = await projRes.json();

    await page.goto(`/app/${workspaceSlug}/projects/${project.id}`);

    // Add a task via the inline form
    const taskInput = page.getByPlaceholder('Add a task...');
    await expect(taskInput).toBeVisible();
    await taskInput.fill('My first task');
    await page.getByRole('button', { name: 'Add' }).click();

    // Task should appear in the table
    await expect(page.getByText('My first task')).toBeVisible({ timeout: 10000 });
  });

  test('task API CRUD', async ({ page }) => {
    if (!workspaceId) {
      test.skip();
      return;
    }

    // Create project
    const projRes = await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/projects`, {
      data: { name: 'CRUD Test Project' },
    });
    const project = await projRes.json();

    // Create task
    const createRes = await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
      data: {
        title: 'CRUD Test Task',
        projectId: project.id,
        priority: 'HIGH',
        status: 'Todo',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const task = await createRes.json();
    expect(task.title).toBe('CRUD Test Task');
    expect(task.priority).toBe('HIGH');

    // Read task
    const getRes = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}`,
    );
    expect(getRes.ok()).toBeTruthy();
    const fetched = await getRes.json();
    expect(fetched.title).toBe('CRUD Test Task');

    // Update task
    const updateRes = await page.request.patch(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}`,
      {
        data: { status: 'In Progress', priority: 'URGENT' },
      },
    );
    expect(updateRes.ok()).toBeTruthy();
    const updated = await updateRes.json();
    expect(updated.status).toBe('In Progress');
    expect(updated.priority).toBe('URGENT');

    // Delete task
    const delRes = await page.request.delete(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}`,
    );
    expect(delRes.ok()).toBeTruthy();

    // Verify deleted
    const verifyRes = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}`,
    );
    expect(verifyRes.status()).toBe(404);
  });

  test('sub-task creation respects depth limit', async ({ page }) => {
    if (!workspaceId) {
      test.skip();
      return;
    }

    // Create chain of 4 sub-tasks (max depth)
    const t1 = await (
      await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Level 0' },
      })
    ).json();

    const t2 = await (
      await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Level 1', parentTaskId: t1.id },
      })
    ).json();

    const t3 = await (
      await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Level 2', parentTaskId: t2.id },
      })
    ).json();

    const t4 = await (
      await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Level 3', parentTaskId: t3.id },
      })
    ).json();

    expect(t4.depth).toBe(3);

    // Level 5 should fail
    const t5Res = await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
      data: { title: 'Level 4 (should fail)', parentTaskId: t4.id },
    });
    expect(t5Res.status()).toBe(400);
    const t5Body = await t5Res.json();
    expect(t5Body.error).toContain('depth');
  });

  test('task status change sets completedAt', async ({ page }) => {
    if (!workspaceId) {
      test.skip();
      return;
    }

    const task = await (
      await page.request.post(`${BASE_URL}/api/workspaces/${workspaceId}/tasks`, {
        data: { title: 'Completion Test' },
      })
    ).json();

    expect(task.completedAt).toBeNull();

    // Mark as Done
    const updated = await (
      await page.request.patch(`${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}`, {
        data: { status: 'Done' },
      })
    ).json();

    expect(updated.completedAt).not.toBeNull();

    // Mark back to Todo
    const reverted = await (
      await page.request.patch(`${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}`, {
        data: { status: 'Todo' },
      })
    ).json();

    expect(reverted.completedAt).toBeNull();
  });

  test('my-tasks page loads', async ({ page }) => {
    await page.goto(`/app/${workspaceSlug}/my-tasks`);
    await expect(page.getByRole('heading', { name: 'My Tasks' })).toBeVisible();
  });

  test('search page loads', async ({ page }) => {
    await page.goto(`/app/${workspaceSlug}/search`);
    await expect(page.getByPlaceholder('Search tasks...')).toBeVisible();
  });
});
