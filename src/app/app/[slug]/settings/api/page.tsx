'use client';

import { formatDistanceToNow } from 'date-fns';
import { Copy, Key, Plus, Trash2, Webhook, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastCalledAt: string | null;
  lastStatus: number | null;
  createdAt: string;
  _count: { deliveries: number };
}

const WEBHOOK_EVENTS = [
  'order.created',
  'order.completed',
  'invoice.paid',
  'client.created',
  'ticket.created',
  'subscription.created',
  'subscription.canceled',
];

export default function ApiSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewKey, setShowNewKey] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');

  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const [keysRes, webhooksRes] = await Promise.all([
        fetch(`/api/workspaces/${ws.id}/api-keys`),
        fetch(`/api/workspaces/${ws.id}/webhooks`),
      ]);

      if (keysRes.ok) setKeys(await keysRes.json());
      if (webhooksRes.ok) setWebhooks(await webhooksRes.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function createKey() {
    if (!keyName.trim() || !workspaceId) return;
    setCreatingKey(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewKeyValue(data.key);
        setKeyName('');
        fetchData();
      }
    } finally {
      setCreatingKey(false);
    }
  }

  async function deleteKey(keyId: string) {
    await fetch(`/api/workspaces/${workspaceId}/api-keys/${keyId}`, { method: 'DELETE' });
    fetchData();
  }

  async function createWebhook() {
    if (!webhookUrl.trim() || webhookEvents.length === 0 || !workspaceId) return;
    setCreatingWebhook(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl.trim(), events: webhookEvents }),
      });
      if (res.ok) {
        setWebhookUrl('');
        setWebhookEvents([]);
        setShowNewWebhook(false);
        fetchData();
      }
    } finally {
      setCreatingWebhook(false);
    }
  }

  async function deleteWebhook(webhookId: string) {
    await fetch(`/api/workspaces/${workspaceId}/webhooks/${webhookId}`, { method: 'DELETE' });
    fetchData();
  }

  async function testWebhook(webhookId: string) {
    await fetch(`/api/workspaces/${workspaceId}/webhooks/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookId, event: 'test.ping' }),
    });
    fetchData();
  }

  function toggleEvent(event: string) {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API & Webhooks</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage API keys and webhook endpoints for integrations.
      </p>

      {/* API Keys */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Key className="h-5 w-5" />
            API Keys
          </h2>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => { setShowNewKey(true); setNewKeyValue(''); }}
          >
            <Plus className="h-4 w-4" />
            Create Key
          </button>
        </div>

        {newKeyValue && (
          <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Copy your API key now — it won&apos;t be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono text-gray-900 dark:bg-gray-900 dark:text-white">
                {newKeyValue}
              </code>
              <button
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => navigator.clipboard.writeText(newKeyValue)}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <button
              className="mt-2 text-xs text-yellow-700 hover:underline dark:text-yellow-400"
              onClick={() => setNewKeyValue('')}
            >
              Dismiss
            </button>
          </div>
        )}

        {showNewKey && !newKeyValue && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New API Key</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowNewKey(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                autoFocus
                className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Key name (e.g. Production)"
                value={keyName}
              />
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={creatingKey || !keyName.trim()}
                onClick={createKey}
              >
                {creatingKey ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {keys.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Key</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Last Used</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{k.keyPrefix}...</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {k.lastUsedAt ? formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true }) : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(k.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-gray-400 hover:text-red-600" onClick={() => deleteKey(k.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {keys.length === 0 && !showNewKey && (
          <p className="mt-4 text-sm text-gray-400">No API keys yet.</p>
        )}
      </div>

      {/* Webhooks */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Webhook className="h-5 w-5" />
            Webhooks
          </h2>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => setShowNewWebhook(true)}
          >
            <Plus className="h-4 w-4" />
            Add Webhook
          </button>
        </div>

        {showNewWebhook && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New Webhook</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowNewWebhook(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              className="mt-3 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              value={webhookUrl}
            />
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Events</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <label
                    className="flex cursor-pointer items-center gap-1.5 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700"
                    key={event}
                  >
                    <input
                      checked={webhookEvents.includes(event)}
                      className="h-3 w-3"
                      onChange={() => toggleEvent(event)}
                      type="checkbox"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
            <button
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={creatingWebhook || !webhookUrl.trim() || webhookEvents.length === 0}
              onClick={createWebhook}
            >
              {creatingWebhook ? 'Creating...' : 'Create Webhook'}
            </button>
          </div>
        )}

        {webhooks.length > 0 && (
          <div className="mt-4 space-y-3">
            {webhooks.map((wh) => (
              <div
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                key={wh.id}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{wh.url}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {wh.events.length} event{wh.events.length !== 1 ? 's' : ''} ·{' '}
                      {wh._count.deliveries} deliveries
                      {wh.lastStatus && (
                        <span className={wh.lastStatus < 300 ? ' text-green-600' : ' text-red-600'}>
                          {' '}· Last: {wh.lastStatus}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        wh.active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {wh.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => testWebhook(wh.id)}
                    >
                      Test
                    </button>
                    <button className="text-gray-400 hover:text-red-600" onClick={() => deleteWebhook(wh.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {webhooks.length === 0 && !showNewWebhook && (
          <p className="mt-4 text-sm text-gray-400">No webhooks configured.</p>
        )}
      </div>
    </div>
  );
}
