'use client';

import { formatDistanceToNow } from 'date-fns';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface CommissionRow {
  id: string;
  affiliateName: string | null;
  affiliateEmail: string;
  orderId: string;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  UNAPPROVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  UNPAID: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

export default function CommissionsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/referrals/commissions`);
      if (res.ok) setCommissions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function bulkUpdate(status: string) {
    if (!workspaceId || selected.size === 0) return;
    await fetch(`/api/workspaces/${workspaceId}/referrals/commissions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), status }),
    });
    setSelected(new Set());
    fetchData();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Commissions</h1>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <button
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => bulkUpdate('UNPAID')}
            >
              Approve ({selected.size})
            </button>
            <button
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              onClick={() => bulkUpdate('PAID')}
            >
              Mark Paid ({selected.size})
            </button>
          </div>
        )}
      </div>

      {commissions.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No commissions yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400"></th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Affiliate</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Order</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {commissions.map((c) => (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" key={c.id}>
                  <td className="px-4 py-3">
                    <input
                      checked={selected.has(c.id)}
                      className="h-4 w-4 rounded"
                      onChange={() => toggleSelect(c.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{c.affiliateName ?? c.affiliateEmail}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.orderId.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">${c.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
