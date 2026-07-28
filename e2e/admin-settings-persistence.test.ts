import { expect, test } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'https://opchestra.com';
const ADMIN_EMAIL = 'darshanpatel@gmail.com';
const ADMIN_PASSWORD = 'Admin1234';

async function adminCookie(request: import('@playwright/test').APIRequestContext): Promise<string> {
  const res = await request.post(`${BASE}/api/admin/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const setCookie = res.headers()['set-cookie'] || '';
  const match = setCookie.match(/admin-session=([^;]+)/);
  return match ? match[1] : '';
}

test.describe('Admin Settings Persistence', () => {
  test('API: all fields persist after PATCH + GET', async ({ request }) => {
    const cookie = await adminCookie(request);
    const headers = { Cookie: `admin-session=${cookie}` };

    // 1. GET current values to restore later
    const origRes = await request.get(`${BASE}/api/admin/settings`, { headers });
    expect(origRes.ok()).toBeTruthy();
    const original = await origRes.json();

    // 2. PATCH with test values
    const testValues: Record<string, unknown> = {
      siteName: 'Test Site Name',
      signupEnabled: false,
      maintenanceMode: true,
      maintenanceWhitelistDomains: 'test.com,example.com',
      disableLogin: false,
      emailProvider: 'resend',
      emailApiKey: 'test_api_key_12345',
      emailFromAddress: 'test-persist@ticket.opchestra.com',
      emailFromName: 'Test Sender',
      r2AccountId: 'test_r2_account',
      r2AccessKeyId: 'test_r2_key',
      r2SecretAccessKey: 'test_r2_secret',
      r2BucketName: 'test-bucket',
      r2PublicUrl: 'https://test-r2.example.com',
      inboundEmailDomain: 'test-ticket.example.com',
      resendWebhookKey: 'test_webhook_key_abc',
      resendWebhookSigningSecret: 'whsec_test_secret',
      maxFreeUsers: 5,
    };

    const patchRes = await request.patch(`${BASE}/api/admin/settings`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: testValues,
    });
    expect(patchRes.ok()).toBeTruthy();

    // 3. GET and verify all values persisted
    const verifyRes = await request.get(`${BASE}/api/admin/settings`, { headers });
    expect(verifyRes.ok()).toBeTruthy();
    const saved = await verifyRes.json();

    const failures: string[] = [];
    for (const [key, expected] of Object.entries(testValues)) {
      const actual = saved[key];
      if (actual !== expected) {
        failures.push(`${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    }

    if (failures.length > 0) {
      console.log('PERSISTENCE FAILURES:');
      for (const f of failures) console.log(`  ${f}`);
    }

    expect(failures).toHaveLength(0);

    // 4. Restore original values
    const restore: Record<string, unknown> = {};
    for (const key of Object.keys(testValues)) {
      restore[key] = original[key] ?? null;
    }
    // Don't send null for required fields
    if (!restore.siteName) restore.siteName = 'Opchestra';
    if (!restore.emailFromAddress) restore.emailFromAddress = 'noreply@opchestra.com';
    if (!restore.emailFromName) restore.emailFromName = 'Opchestra';
    if (!restore.inboundEmailDomain) restore.inboundEmailDomain = 'ticket.opchestra.com';
    if (!restore.r2BucketName) restore.r2BucketName = 'opchestra';
    if (restore.maxFreeUsers === null) restore.maxFreeUsers = 3;
    if (restore.signupEnabled === null) restore.signupEnabled = true;
    if (restore.maintenanceMode === null) restore.maintenanceMode = false;
    if (restore.disableLogin === null) restore.disableLogin = false;

    await request.patch(`${BASE}/api/admin/settings`, {
      headers: { ...headers, 'Content-Type': 'application/json' },
      data: restore,
    });
  });

  test('UI: emailFromAddress persists after page refresh', async ({ page }) => {
    // Login
    await page.goto('/admin-login');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Go to settings
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find and update emailFromAddress
    const fromEmailInput = page.locator('#emailFromAddress');
    if (await fromEmailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Save original
      const origValue = await fromEmailInput.inputValue();

      // Set test value
      await fromEmailInput.fill('ui-test-persist@example.com');

      // Find and click the Save button for email settings
      const saveBtn = page.getByRole('button', { name: /save.*email/i }).first();
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1000);
      }

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify value persisted
      const newValue = await fromEmailInput.inputValue();
      expect(newValue).toBe('ui-test-persist@example.com');

      // Restore original
      await fromEmailInput.fill(origValue || 'noreply@opchestra.com');
      if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
