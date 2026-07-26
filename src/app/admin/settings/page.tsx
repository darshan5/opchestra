'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Settings {
  siteName: string;
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

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

    if (res.ok) {
      setMessage('Plan settings saved');
    } else {
      setMessage('Failed to save');
    }
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
          <Button loading={saving} onClick={saveEmailSettings}>
            Save Email Settings
          </Button>
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
          <Button loading={saving} onClick={saveStorageSettings}>
            Save Storage Settings
          </Button>
        </div>
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
    </div>
  );
}
