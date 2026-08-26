'use client';

import { CreditCard, Unlink } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function PaymentSettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [connected, setConnected] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [inputAccountId, setInputAccountId] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/stripe-connect`);
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setAccountId(data.accountId ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!inputAccountId.trim() || !workspaceId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/stripe-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: inputAccountId.trim() }),
      });
      if (res.ok) {
        setConnected(true);
        setAccountId(inputAccountId.trim());
        setInputAccountId('');
        setMessage('Stripe account connected.');
      } else {
        const data = await res.json();
        setMessage(data.error ?? 'Failed to connect.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!workspaceId) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/stripe-connect`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConnected(false);
        setAccountId('');
        setMessage('Stripe account disconnected.');
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

  const maskedId = accountId
    ? `${accountId.slice(0, 6)}${'•'.repeat(Math.max(0, accountId.length - 10))}${accountId.slice(-4)}`
    : '';

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Connect your Stripe account to accept payments from clients.
      </p>

      {message && (
        <p className="mt-3 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Stripe Connect
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Payments go directly to your Stripe account.
            </p>
          </div>
        </div>

        {connected ? (
          <div className="mt-4">
            <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Connected</p>
                <p className="mt-0.5 font-mono text-xs text-green-600 dark:text-green-500">
                  {maskedId}
                </p>
              </div>
              <button
                className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                disabled={saving}
                onClick={handleDisconnect}
              >
                <Unlink className="h-3.5 w-3.5" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-4" onSubmit={handleConnect}>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Stripe Account ID
            </label>
            <p className="mt-0.5 text-xs text-gray-400">
              Find this in your Stripe Dashboard under Settings → Account details.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onChange={(e) => setInputAccountId(e.target.value)}
                placeholder="acct_1234567890"
                value={inputAccountId}
              />
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={saving || !inputAccountId.trim()}
                type="submit"
              >
                {saving ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
