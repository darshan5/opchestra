'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function PortalSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');

  const [enabled, setEnabled] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [accentColor, setAccentColor] = useState('#8b5cf6');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const wsRes = await fetch(`/api/workspaces`);
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/portal/settings`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        setPrimaryColor(data.primaryColor ?? '#6366f1');
        setAccentColor(data.accentColor ?? '#8b5cf6');
        setWelcomeMessage(data.welcomeMessage ?? '');
        setCustomDomain(data.customDomain ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId) return;
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/portal/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          primaryColor,
          accentColor,
          welcomeMessage: welcomeMessage || null,
          customDomain: customDomain || null,
        }),
      });
      if (res.ok) {
        setMessage('Portal settings saved.');
        router.refresh();
      } else {
        setMessage('Failed to save settings.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Portal</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Configure the branded portal where clients view their tickets, invoices, and orders.
      </p>

      {message && (
        <p className="mt-3 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <form className="mt-6 space-y-6" onSubmit={handleSave}>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Portal</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allow clients to log in and view their dashboard.
            </p>
          </div>
          <button
            className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
            onClick={() => setEnabled(!enabled)}
            type="button"
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow ${enabled ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Branding</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Primary Color
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  className="h-8 w-8 cursor-pointer rounded border-0"
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  type="color"
                  value={primaryColor}
                />
                <input
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  value={primaryColor}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Accent Color
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  className="h-8 w-8 cursor-pointer rounded border-0"
                  onChange={(e) => setAccentColor(e.target.value)}
                  type="color"
                  value={accentColor}
                />
                <input
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setAccentColor(e.target.value)}
                  value={accentColor}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Welcome Message
            </label>
            <input
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome back, {{name}}"
              value={welcomeMessage}
            />
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Custom Domain
            </label>
            <input
              className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="portal.youragency.com"
              value={customDomain}
            />
            <p className="mt-1 text-xs text-gray-400">
              Point a CNAME record to your opchestra domain.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Portal URL</p>
            <p className="mt-0.5 font-mono text-xs text-blue-600 dark:text-blue-400">
              {typeof window !== 'undefined' ? window.location.origin : ''}/portal/{slug}
            </p>
          </div>
        </div>

        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={saving}
          type="submit"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
