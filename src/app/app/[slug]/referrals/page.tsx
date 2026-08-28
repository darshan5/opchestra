'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface CommissionRule {
  id: string;
  serviceId: string | null;
  type: string;
  value: number;
  perpetual: boolean;
  duration: number | null;
}

interface Program {
  id: string;
  enabled: boolean;
  cookieDays: number;
  autoApproveAffiliates: boolean;
  autoApproveCommissions: boolean;
  redirectUrl: string | null;
  commissionRules: CommissionRule[];
  _count: { affiliates: number };
}

export default function ReferralsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProgram = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/referrals`);
      if (res.ok) setProgram(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  async function handleSave() {
    if (!workspaceId || !program) return;
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/workspaces/${workspaceId}/referrals`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: program.enabled,
        cookieDays: program.cookieDays,
        autoApproveAffiliates: program.autoApproveAffiliates,
        autoApproveCommissions: program.autoApproveCommissions,
        redirectUrl: program.redirectUrl || null,
      }),
    });
    if (res.ok) {
      setMessage('Settings saved.');
      fetchProgram();
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referral Program</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Let clients earn commissions by referring new customers.
      </p>

      {message && (
        <p className="mt-3 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      {program && (
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Program</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {program._count.affiliates} affiliate{program._count.affiliates !== 1 ? 's' : ''} registered
              </p>
            </div>
            <button
              className={`relative h-6 w-11 rounded-full transition-colors ${program.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
              onClick={() => setProgram({ ...program, enabled: !program.enabled })}
              type="button"
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${program.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Settings</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Cookie Duration (days)</label>
                <input
                  className="mt-1 w-32 rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  min="1"
                  onChange={(e) => setProgram({ ...program, cookieDays: parseInt(e.target.value) || 30 })}
                  type="number"
                  value={program.cookieDays}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Redirect URL</label>
                <input
                  className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setProgram({ ...program, redirectUrl: e.target.value })}
                  placeholder="https://youragency.com/services"
                  value={program.redirectUrl ?? ''}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  checked={program.autoApproveAffiliates}
                  className="h-4 w-4 rounded"
                  onChange={(e) => setProgram({ ...program, autoApproveAffiliates: e.target.checked })}
                  type="checkbox"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">Auto-approve new affiliates</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  checked={program.autoApproveCommissions}
                  className="h-4 w-4 rounded"
                  onChange={(e) => setProgram({ ...program, autoApproveCommissions: e.target.checked })}
                  type="checkbox"
                />
                <label className="text-sm text-gray-700 dark:text-gray-300">Auto-approve commissions</label>
              </div>
            </div>
          </div>

          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
