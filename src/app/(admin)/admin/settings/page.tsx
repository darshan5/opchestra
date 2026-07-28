'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Settings {
  siteName: string;
  signupEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceWhitelistDomains: string;
  disableLogin: boolean;
  emailProvider: string;
  emailApiKey: string | null;
  emailFromAddress: string;
  emailFromName: string;
  r2AccountId: string | null;
  r2AccessKeyId: string | null;
  r2SecretAccessKey: string | null;
  r2BucketName: string;
  r2PublicUrl: string | null;
  maxFreeUsers: number;
}

function Toggle({
  enabled,
  onToggle,
  testId,
}: {
  enabled: boolean;
  onToggle: () => void;
  testId?: string;
}) {
  return (
    <button
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
      }`}
      data-testid={testId}
      onClick={onToggle}
      type="button"
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [signupEnabled, setSignupEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceWhitelistDomains, setMaintenanceWhitelistDomains] = useState('');
  const [disableLogin, setDisableLogin] = useState(false);
  const [emailApiKey, setEmailApiKey] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailFromName, setEmailFromName] = useState('');
  const [r2AccountId, setR2AccountId] = useState('');
  const [r2AccessKeyId, setR2AccessKeyId] = useState('');
  const [r2SecretAccessKey, setR2SecretAccessKey] = useState('');
  const [r2BucketName, setR2BucketName] = useState('');
  const [r2PublicUrl, setR2PublicUrl] = useState('');
  const [maxFreeUsers, setMaxFreeUsers] = useState('3');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setSignupEnabled(data.signupEnabled ?? true);
        setMaintenanceMode(data.maintenanceMode ?? false);
        setMaintenanceWhitelistDomains(data.maintenanceWhitelistDomains ?? '');
        setDisableLogin(data.disableLogin ?? false);
        setEmailFromAddress(data.emailFromAddress || '');
        setEmailFromName(data.emailFromName || '');
        setR2AccountId(data.r2AccountId || '');
        setR2BucketName(data.r2BucketName || '');
        setR2PublicUrl(data.r2PublicUrl || '');
        setMaxFreeUsers(String(data.maxFreeUsers || 3));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function toggleSetting(field: string, currentValue: boolean, setter: (v: boolean) => void) {
    const newVal = !currentValue;
    setter(newVal);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: newVal }),
    });
    if (res.ok) {
      const labels: Record<string, string> = {
        disableLogin: 'Login disable',
        maintenanceMode: 'Maintenance mode',
        signupEnabled: 'Signup',
      };
      const label = labels[field] || field;
      setMessage(newVal ? `${label} enabled` : `${label} disabled`);
    } else {
      setter(currentValue);
      setMessage('Failed to update');
    }
  }

  async function saveMaintenanceWhitelist() {
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenanceWhitelistDomains }),
    });
    setMessage(res.ok ? 'Whitelist saved' : 'Failed to save');
    setSaving(false);
  }

  async function saveEmailSettings() {
    setSaving(true);
    setMessage('');
    const data: Record<string, unknown> = { emailFromAddress, emailFromName };
    if (emailApiKey) {
      data.emailApiKey = emailApiKey;
    }
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setMessage('Email settings saved');
      setEmailApiKey('');
    } else {
      setMessage('Failed to save');
    }
    setSaving(false);
  }

  async function saveStorageSettings() {
    setSaving(true);
    setMessage('');
    const data: Record<string, unknown> = { r2AccountId, r2BucketName, r2PublicUrl };
    if (r2AccessKeyId) {
      data.r2AccessKeyId = r2AccessKeyId;
    }
    if (r2SecretAccessKey) {
      data.r2SecretAccessKey = r2SecretAccessKey;
    }
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setMessage('Storage settings saved');
      setR2AccessKeyId('');
      setR2SecretAccessKey('');
    } else {
      setMessage('Failed to save');
    }
    setSaving(false);
  }

  async function savePlanSettings() {
    setSaving(true);
    setMessage('');
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxFreeUsers: parseInt(maxFreeUsers, 10) }),
    });
    setMessage(res.ok ? 'Plan settings saved' : 'Failed to save');
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Access Control</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Public Signup</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow new users to create accounts via the signup page
              </p>
            </div>
            <Toggle
              enabled={signupEnabled}
              onToggle={() => toggleSetting('signupEnabled', signupEnabled, setSignupEnabled)}
              testId="signup-toggle"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Block signups except for whitelisted domains
              </p>
            </div>
            <Toggle
              enabled={maintenanceMode}
              onToggle={() => toggleSetting('maintenanceMode', maintenanceMode, setMaintenanceMode)}
              testId="maintenance-toggle"
            />
          </div>

          {maintenanceMode && (
            <div className="ml-4 space-y-2 border-l-2 border-blue-200 pl-4 dark:border-blue-800">
              <Input
                id="whitelist"
                label="Whitelisted domains (comma-separated)"
                onChange={(e) => setMaintenanceWhitelistDomains(e.target.value)}
                placeholder="company.com, partner.org"
                type="text"
                value={maintenanceWhitelistDomains}
              />
              <Button loading={saving} onClick={saveMaintenanceWhitelist} size="sm">
                Save Whitelist
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Disable Login</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Block all non-admin logins. Admins can still sign in.
              </p>
            </div>
            <Toggle
              enabled={disableLogin}
              onToggle={() => toggleSetting('disableLogin', disableLogin, setDisableLogin)}
              testId="disable-login-toggle"
            />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email (Resend)</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure email delivery for verification, password resets, and notifications.
        </p>
        <div className="mt-4 space-y-3">
          <Input
            id="emailApiKey"
            label="Resend API Key"
            onChange={(e) => setEmailApiKey(e.target.value)}
            placeholder={settings?.emailApiKey ? 'Key set (enter new to replace)' : 're_...'}
            type="password"
            value={emailApiKey}
          />
          <Input
            id="emailFromAddress"
            label="From Email"
            onChange={(e) => setEmailFromAddress(e.target.value)}
            type="email"
            value={emailFromAddress}
          />
          <Input
            id="emailFromName"
            label="From Name"
            onChange={(e) => setEmailFromName(e.target.value)}
            type="text"
            value={emailFromName}
          />
          <div className="flex items-center gap-3">
            <Button loading={saving} onClick={saveEmailSettings}>
              Save Email Settings
            </Button>
            <TestButton endpoint="/api/admin/test-email" label="Send Test Email" needsInput inputPlaceholder="Recipient email" inputType="email" />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          File Storage (Cloudflare R2)
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure object storage for file attachments.
        </p>
        <div className="mt-4 space-y-3">
          <Input
            id="r2AccountId"
            label="Account ID"
            onChange={(e) => setR2AccountId(e.target.value)}
            type="text"
            value={r2AccountId}
          />
          <Input
            id="r2AccessKeyId"
            label="Access Key ID"
            onChange={(e) => setR2AccessKeyId(e.target.value)}
            placeholder={settings?.r2AccessKeyId ? 'Key set (enter new to replace)' : ''}
            type="password"
            value={r2AccessKeyId}
          />
          <Input
            id="r2SecretAccessKey"
            label="Secret Access Key"
            onChange={(e) => setR2SecretAccessKey(e.target.value)}
            placeholder={settings?.r2SecretAccessKey ? 'Key set (enter new to replace)' : ''}
            type="password"
            value={r2SecretAccessKey}
          />
          <Input
            id="r2BucketName"
            label="Bucket Name"
            onChange={(e) => setR2BucketName(e.target.value)}
            type="text"
            value={r2BucketName}
          />
          <Input
            id="r2PublicUrl"
            label="Public URL"
            onChange={(e) => setR2PublicUrl(e.target.value)}
            placeholder="https://files.opchestra.com"
            type="url"
            value={r2PublicUrl}
          />
          <div className="flex items-center gap-3">
            <Button loading={saving} onClick={saveStorageSettings}>
              Save Storage Settings
            </Button>
            <TestButton endpoint="/api/admin/test-r2" label="Test R2 Connection" />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Stripe API key is set via the STRIPE_SECRET_KEY environment variable.
        </p>
        <div className="mt-4">
          <TestButton endpoint="/api/admin/test-stripe" label="Test Stripe Connection" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inbound Email Webhook</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure this URL in Resend to receive inbound emails and create tickets.
        </p>
        <WebhookUrlDisplay />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plan Limits</h2>
        <div className="mt-4 space-y-3">
          <Input
            id="maxFreeUsers"
            label="Max users on free tier"
            onChange={(e) => setMaxFreeUsers(e.target.value)}
            type="number"
            value={maxFreeUsers}
          />
          <Button loading={saving} onClick={savePlanSettings}>
            Save Plan Settings
          </Button>
        </div>
      </section>

      <hr className="my-10 border-gray-200 dark:border-gray-800" />

      <AdminProfileSection />
      <AdminChangePasswordSection />
    </div>
  );
}

function AdminProfileSection() {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setMsg(res.ok ? 'Profile updated' : 'Failed');
    setSaving(false);
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Profile</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update your display name.</p>
      <div className="mt-4 space-y-3">
        <Input
          id="adminName"
          label="Name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          type="text"
          value={name}
        />
        {msg && <p className="text-sm text-blue-600 dark:text-blue-400">{msg}</p>}
        <Button loading={saving} onClick={save} size="sm">
          Save Changes
        </Button>
      </div>
    </section>
  );
}

function AdminChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    if (newPassword !== confirmPassword) {
      setMsg('Passwords do not match');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setMsg(res.ok ? 'Password changed' : data.error || 'Failed');
    if (res.ok) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Enter your current password and choose a new one.
      </p>
      <div className="mt-4 space-y-3">
        <Input
          id="currentPw"
          label="Current Password"
          onChange={(e) => setCurrentPassword(e.target.value)}
          type="password"
          value={currentPassword}
        />
        <Input
          id="newPw"
          label="New Password"
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
          type="password"
          value={newPassword}
        />
        <Input
          id="confirmPw"
          label="Confirm New Password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          type="password"
          value={confirmPassword}
        />
        {msg && (
          <p
            className={`text-sm ${msg.includes('changed') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {msg}
          </p>
        )}
        <Button loading={saving} onClick={save} size="sm">
          Change Password
        </Button>
      </div>
    </section>
  );
}

function TestButton({
  endpoint,
  inputPlaceholder,
  inputType,
  label,
  needsInput,
}: {
  endpoint: string;
  label: string;
  needsInput?: boolean;
  inputPlaceholder?: string;
  inputType?: string;
}) {
  const [inputVal, setInputVal] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function test() {
    if (needsInput && !inputVal.trim()) {
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(needsInput ? { to: inputVal.trim() } : {}),
      });
      const data = await res.json();
      setResult({
        msg: res.ok ? data.message || 'Connected' : data.error || 'Failed',
        ok: res.ok,
      });
    } catch {
      setResult({ msg: 'Request failed', ok: false });
    }
    setTesting(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {needsInput && (
        <input
          className="rounded border border-gray-300 px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={inputPlaceholder || 'Enter value'}
          type={inputType || 'text'}
          value={inputVal}
        />
      )}
      <button
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        disabled={testing || (needsInput && !inputVal.trim())}
        onClick={test}
        type="button"
      >
        {testing ? 'Testing...' : label}
      </button>
      {result && (
        <span className={`text-xs font-medium ${result.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {result.ok ? '✓' : '✗'} {result.msg}
        </span>
      )}
    </div>
  );
}

function WebhookUrlDisplay() {
  const [data, setData] = useState<{ resendWebhookKey?: string; resendWebhookSigningSecret?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) {
    return null;
  }

  const webhookUrl = data.resendWebhookKey
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/resend/${data.resendWebhookKey}`
    : 'Not configured — run /api/admin/setup first';

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Webhook URL</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate text-xs text-gray-800 dark:text-gray-200">{webhookUrl}</code>
          {data.resendWebhookKey && (
            <button
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              type="button"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500 dark:text-gray-400">Signing Secret:</span>
        <span className={`font-medium ${data.resendWebhookSigningSecret ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
          {data.resendWebhookSigningSecret ? '✓ Configured' : '⚠ Not set (webhook will accept unsigned requests)'}
        </span>
      </div>
    </div>
  );
}
