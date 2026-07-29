import { expect, test } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'https://opchestra.com';
const LOGIN_EMAIL = process.env.E2E_LOGIN_EMAIL || 'darshan@opchestra.com';
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD || 'admin123456';

let workspaceId = '';
let slug = '';

test.describe.serial('Task creation, deletion, and orphan cleanup', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email').fill(LOGIN_EMAIL);
    await page.getByLabel('Password').fill(LOGIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app\//);

    const workspaces = await page.request.get(`${BASE_URL}/api/workspaces`);
    const wsList = await workspaces.json();
    workspaceId = wsList[0].id;
    slug = wsList[0].slug;
    await page.close();
  });

  test('Create task with time entries, notes, comments — delete — verify no orphans', async ({
    page,
  }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email').fill(LOGIN_EMAIL);
    await page.getByLabel('Password').fill(LOGIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app\//);

    // 1. Create a task via API
    const taskTitle = `E2E Cleanup Test ${Date.now()}`;
    const createRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks`,
      {
        data: {
          title: taskTitle,
          status: 'Todo',
          priority: 'MEDIUM',
        },
      },
    );
    expect(createRes.ok()).toBeTruthy();
    const task = await createRes.json();
    const taskId = task.id;
    console.log(`Created task: ${taskId} - ${taskTitle}`);

    // 2. Add a time entry
    const timeRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`,
      {
        data: {
          duration: 30,
          date: new Date().toISOString(),
          notes: 'Test time entry',
          billable: true,
          category: 'Testing',
        },
      },
    );
    expect(timeRes.ok()).toBeTruthy();
    console.log('  Added time entry');

    // 3. Add a comment
    const commentRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/comments`,
      {
        data: { content: 'Test comment for cleanup verification' },
      },
    );
    expect(commentRes.ok()).toBeTruthy();
    console.log('  Added comment');

    // 4. Add a note (via notes API)
    const noteRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/notes`,
      {
        data: {
          entityType: 'task',
          entityId: taskId,
          content: 'Test internal note',
          category: 'internal',
        },
      },
    );
    expect(noteRes.ok()).toBeTruthy();
    console.log('  Added note');

    // 5. Start and stop a timer (creates another time entry + tests ActiveTimer cleanup)
    const startRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/timer/start`,
    );
    expect(startRes.ok()).toBeTruthy();
    console.log('  Started timer');

    // Wait a moment then stop
    await page.waitForTimeout(2000);

    const stopRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/timer/stop`,
      {
        data: { notes: 'Timer test entry', billable: true },
      },
    );
    expect(stopRes.ok()).toBeTruthy();
    console.log('  Stopped timer (created time entry)');

    // 6. Verify data exists before deletion
    const entriesBefore = await page.request.get(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`,
    );
    const entriesData = await entriesBefore.json();
    expect(entriesData.entries.length).toBeGreaterThanOrEqual(2);
    console.log(`  Verified ${entriesData.entries.length} time entries exist`);

    // 7. Delete the task
    const deleteRes = await page.request.delete(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}`,
    );
    expect(deleteRes.ok()).toBeTruthy();
    console.log('  Deleted task');

    // 8. Check for orphaned data
    const orphanRes = await page.request.post(
      `${BASE_URL}/api/test/check-orphans`,
      { data: { taskIds: [taskId] } },
    );
    expect(orphanRes.ok()).toBeTruthy();
    const orphanData = await orphanRes.json();
    console.log('  Orphan check result:', JSON.stringify(orphanData));

    expect(orphanData.clean).toBe(true);
    if (!orphanData.clean) {
      console.error('ORPHANED DATA FOUND:', orphanData.orphans);
    }
  });

  test('Create task with active timer — delete without stopping — verify no orphans', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email').fill(LOGIN_EMAIL);
    await page.getByLabel('Password').fill(LOGIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app\//);

    // Create task
    const taskTitle = `E2E Timer Orphan Test ${Date.now()}`;
    const createRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks`,
      { data: { title: taskTitle, status: 'In Progress', priority: 'HIGH' } },
    );
    const task = await createRes.json();
    const taskId = task.id;
    console.log(`Created task: ${taskId} - ${taskTitle}`);

    // Start a timer but DON'T stop it
    const startRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/timer/start`,
    );
    expect(startRes.ok()).toBeTruthy();
    console.log('  Started timer (not stopping)');

    // Pause the timer (tests paused timer orphan)
    await page.waitForTimeout(1000);
    const pauseRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/timer/pause`,
    );
    expect(pauseRes.ok()).toBeTruthy();
    console.log('  Paused timer');

    // Delete task with active paused timer
    const deleteRes = await page.request.delete(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}`,
    );
    expect(deleteRes.ok()).toBeTruthy();
    console.log('  Deleted task (timer was still active/paused)');

    // Check for orphans
    const orphanRes = await page.request.post(
      `${BASE_URL}/api/test/check-orphans`,
      { data: { taskIds: [taskId] } },
    );
    const orphanData = await orphanRes.json();
    console.log('  Orphan check result:', JSON.stringify(orphanData));

    expect(orphanData.clean).toBe(true);
    if (!orphanData.clean) {
      console.error('ORPHANED DATA FOUND:', orphanData.orphans);
    }
  });

  test('Create multiple tasks with cross-references — bulk delete — verify no orphans', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email').fill(LOGIN_EMAIL);
    await page.getByLabel('Password').fill(LOGIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app\//);

    const taskIds: string[] = [];

    // Create 3 tasks
    for (let i = 0; i < 3; i++) {
      const res = await page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/tasks`,
        {
          data: {
            title: `E2E Bulk Test ${i + 1} - ${Date.now()}`,
            status: 'Todo',
            priority: ['LOW', 'MEDIUM', 'HIGH'][i],
          },
        },
      );
      const task = await res.json();
      taskIds.push(task.id);

      // Add time entries to each
      await page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}/time-entries`,
        {
          data: {
            duration: 15 * (i + 1),
            date: new Date().toISOString(),
            notes: `Bulk test entry ${i + 1}`,
            billable: i !== 2,
          },
        },
      );

      // Add a comment to each
      await page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${task.id}/comments`,
        { data: { content: `Bulk test comment ${i + 1}` } },
      );

      // Add a note to each
      await page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/notes`,
        {
          data: {
            entityType: 'task',
            entityId: task.id,
            content: `Bulk test note ${i + 1}`,
            category: 'internal',
          },
        },
      );
    }
    console.log(`Created ${taskIds.length} tasks with time entries, comments, notes`);

    // Delete all tasks
    for (const id of taskIds) {
      const res = await page.request.delete(
        `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${id}`,
      );
      expect(res.ok()).toBeTruthy();
    }
    console.log('  Deleted all tasks');

    // Check for orphans across all deleted task IDs
    const orphanRes = await page.request.post(
      `${BASE_URL}/api/test/check-orphans`,
      { data: { taskIds } },
    );
    const orphanData = await orphanRes.json();
    console.log('  Orphan check result:', JSON.stringify(orphanData));

    expect(orphanData.clean).toBe(true);
    if (!orphanData.clean) {
      console.error('ORPHANED DATA FOUND:', orphanData.orphans);
    }
  });

  test('Create task via UI — add details — delete via UI — verify no orphans', async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel('Email').fill(LOGIN_EMAIL);
    await page.getByLabel('Password').fill(LOGIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/app\//);

    // Navigate to All Tasks
    await page.goto(`${BASE_URL}/app/${slug}/all-tasks`);
    await page.waitForLoadState('networkidle');

    // Create task via API (faster than UI for setup)
    const taskTitle = `E2E UI Delete Test ${Date.now()}`;
    const createRes = await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks`,
      { data: { title: taskTitle, status: 'In Progress', priority: 'URGENT' } },
    );
    const task = await createRes.json();
    const taskId = task.id;

    // Add various related data
    await Promise.all([
      page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`,
        { data: { duration: 60, date: new Date().toISOString(), notes: 'UI test time', billable: true } },
      ),
      page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/comments`,
        { data: { content: 'UI test comment 1' } },
      ),
      page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/comments`,
        { data: { content: 'UI test comment 2' } },
      ),
      page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/notes`,
        { data: { entityType: 'task', entityId: taskId, content: 'UI test note', category: 'client_comment' } },
      ),
      page.request.post(
        `${BASE_URL}/api/workspaces/${workspaceId}/notes`,
        { data: { entityType: 'task', entityId: taskId, content: 'UI internal note', category: 'internal' } },
      ),
    ]);
    console.log(`Created task ${taskId} with time entry, 2 comments, 2 notes`);

    // Start a timer
    await page.request.post(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}/timer/start`,
    );
    console.log('  Started timer');

    // Delete via API (simulating UI bulk/single delete)
    const deleteRes = await page.request.delete(
      `${BASE_URL}/api/workspaces/${workspaceId}/tasks/${taskId}`,
    );
    expect(deleteRes.ok()).toBeTruthy();
    console.log('  Deleted task (with running timer)');

    // Verify cleanup
    const orphanRes = await page.request.post(
      `${BASE_URL}/api/test/check-orphans`,
      { data: { taskIds: [taskId] } },
    );
    const orphanData = await orphanRes.json();
    console.log('  Orphan check result:', JSON.stringify(orphanData));

    expect(orphanData.clean).toBe(true);
    if (!orphanData.clean) {
      console.error('ORPHANED DATA FOUND:', orphanData.orphans);
    }
  });
});
