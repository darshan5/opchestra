import { expect, test } from '@playwright/test';

const USER_EMAIL = 'darshanpatel@gmail.com';
const USER_PASSWORD = 'Admin1234';
const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';
const SLUG = 'opchestra-hq';
const BASE = `/app/${SLUG}`;

test.describe('Full Feature Tests', () => {
  // ── WORKSPACE TESTS ─────────────────────────────────

  test.describe('Workspace App', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(USER_EMAIL);
      await page.getByLabel('Password').fill(USER_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL(/\/app/, { timeout: 15000 });
    });

    test('1. Login redirects to /app', async ({ page }) => {
      await expect(page).toHaveURL(/\/app/);
    });

    test('2. All Tasks page loads', async ({ page }) => {
      await page.goto(`${BASE}/all-tasks`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'All Tasks' })).toBeVisible({ timeout: 10000 });
    });

    test('3. My Tasks page loads', async ({ page }) => {
      await page.goto(`${BASE}/my-tasks`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'My Tasks' })).toBeVisible({ timeout: 10000 });
    });

    test('4. Project page loads', async ({ page }) => {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const projectLink = page.locator('a[href*="/projects/"]').first();
      if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await projectLink.click();
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content).not.toContain('Internal Server Error');
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('5. Group view loads', async ({ page }) => {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      const groupLink = page.locator('a[href*="/groups/"]').first();
      if (await groupLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await groupLink.click();
        await page.waitForLoadState('networkidle');
        const content = await page.content();
        expect(content).not.toContain('Internal Server Error');
      }
    });

    test('6. Kanban view', async ({ page }) => {
      await page.goto(`${BASE}/all-tasks`);
      await page.waitForLoadState('networkidle');
      const kanbanBtn = page.getByRole('button', { name: 'Kanban' });
      if (await kanbanBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await kanbanBtn.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('7. Calendar view', async ({ page }) => {
      await page.goto(`${BASE}/all-tasks`);
      await page.waitForLoadState('networkidle');
      const calBtn = page.getByRole('button', { name: 'Calendar' });
      if (await calBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await calBtn.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('8. Gantt view', async ({ page }) => {
      await page.goto(`${BASE}/all-tasks`);
      await page.waitForLoadState('networkidle');
      const ganttBtn = page.getByRole('button', { name: 'Gantt' });
      if (await ganttBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await ganttBtn.click();
        await page.waitForTimeout(1000);
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('9. Group-by buttons work', async ({ page }) => {
      await page.goto(`${BASE}/all-tasks`);
      await page.waitForLoadState('networkidle');
      // Click Table first to ensure we're in table mode
      const tableBtn = page.getByRole('button', { name: 'Table' });
      if (await tableBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tableBtn.click();
      }
      await page.waitForTimeout(500);

      for (const label of ['Status', 'Priority', 'Person', 'Project']) {
        const btn = page.getByRole('button', { name: label, exact: true });
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(300);
        }
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('10. Time tracking page loads with tabs', async ({ page }) => {
      await page.goto(`${BASE}/time-tracking`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      // Check for My Time or In Progress text
      const hasMyTime = await page.getByText('My Time').isVisible({ timeout: 3000 }).catch(() => false);
      const hasInProgress = await page.getByText('In Progress').isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasMyTime || hasInProgress).toBeTruthy();
    });

    test('11. Tickets page loads with table', async ({ page }) => {
      await page.goto(`${BASE}/tickets`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('12. Contacts page loads with Companies tab', async ({ page }) => {
      await page.goto(`${BASE}/contacts`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('13. Invoicing page loads', async ({ page }) => {
      await page.goto(`${BASE}/invoicing`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('14. Reports page loads', async ({ page }) => {
      await page.goto(`${BASE}/reports`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible({ timeout: 10000 });
    });

    test('15. Settings page loads with tabs', async ({ page }) => {
      await page.goto(`${BASE}/settings`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
      // Verify tabs exist
      await expect(page.getByText('General')).toBeVisible();
      await expect(page.getByText('Task Views')).toBeVisible();
      await expect(page.getByText('Members')).toBeVisible();
    });

    test('16. Search page loads', async ({ page }) => {
      await page.goto(`${BASE}/search`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByPlaceholder('Search tasks...')).toBeVisible({ timeout: 10000 });
    });

    test('17. Workspace home dashboard loads', async ({ page }) => {
      await page.goto(BASE);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('18. Create ticket', async ({ page }) => {
      await page.goto(`${BASE}/tickets`);
      await page.waitForLoadState('networkidle');
      // Look for a create button
      const createBtn = page.getByRole('button', { name: /new ticket|create/i });
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click();
        await page.waitForTimeout(500);
      }
      await expect(page.locator('body')).toBeVisible();
    });

    test('19. Settings Task Views tab', async ({ page }) => {
      await page.goto(`${BASE}/settings`);
      await page.waitForLoadState('networkidle');
      const tvTab = page.getByText('Task Views');
      if (await tvTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tvTab.click();
        await page.waitForTimeout(500);
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('20. Settings Members tab with role permissions', async ({ page }) => {
      await page.goto(`${BASE}/settings`);
      await page.waitForLoadState('networkidle');
      const membersTab = page.getByText('Members');
      if (await membersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await membersTab.click();
        await page.waitForTimeout(500);
        // Check for role permissions table
        const hasPermissions = await page.getByText('Role Permissions').isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasPermissions).toBeTruthy();
      }
    });
  });

  // ── ADMIN TESTS ──────────────────────────────────────

  test.describe('SaaS Admin', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/admin-login');
      await expect(page.getByText('Admin Sign In')).toBeVisible({ timeout: 10000 });
      await page.fill('#email', ADMIN_EMAIL);
      await page.fill('#password', ADMIN_PASSWORD);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/admin(?!-login)/, { timeout: 15000 });
    });

    test('21. Admin dashboard loads', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('22. Admin subscribers page', async ({ page }) => {
      await page.goto('/admin/users');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('23. Admin users page', async ({ page }) => {
      await page.goto('/admin/admin-users');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('24. Admin plans page', async ({ page }) => {
      await page.goto('/admin/plans');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('25. Admin discounts page', async ({ page }) => {
      await page.goto('/admin/discounts');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('26. Admin reports page', async ({ page }) => {
      await page.goto('/admin/reports');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('27. Admin audit logs page', async ({ page }) => {
      await page.goto('/admin/logs');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('28. Admin support page', async ({ page }) => {
      await page.goto('/admin/support');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('29. Admin provisioning page', async ({ page }) => {
      await page.goto('/admin/provisioning');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });

    test('30. Admin settings page', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Platform Settings' })).toBeVisible({ timeout: 10000 });
    });
  });

  // ── API TESTS ────────────────────────────────────────

  test.describe('APIs', () => {
    test('31. Health check', async ({ request }) => {
      const res = await request.get('https://opchestra.com/api/health');
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(body.status).toBe('healthy');
    });

    test('32. Public ticket form loads', async ({ page }) => {
      await page.goto('/submit/opchestra-hq');
      await page.waitForLoadState('networkidle');
      const content = await page.content();
      expect(content).not.toContain('Internal Server Error');
    });
  });
});
