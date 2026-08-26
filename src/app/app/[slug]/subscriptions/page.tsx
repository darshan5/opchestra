'use client';

import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface SubscriptionRow {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  client: { name: string | null; email: string } | null;
  service: { name: string; price: number } | null;
}

type FilterTab = 'ALL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  PAST_DUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  PENDING_CANCEL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  CANCELED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function AdminSubscriptionsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('ALL');

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;

      const url = filter === 'ALL'
        ? `/api/workspaces/${ws.id}/subscriptions`
        : `/api/workspaces/${ws.id}/subscriptions?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) setSubscriptions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: Array<{ key: FilterTab; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'PAST_DUE', label: 'Past Due' },
    { key: 'CANCELED', label: 'Canceled' },
  ];

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>

      <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              filter === t.key
                ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
            )}
            key={t.key}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subscriptions.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No subscriptions found.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Service</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Period</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Cancels</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {subscriptions.map((sub) => (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" key={sub.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {sub.client?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">{sub.client?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {sub.service?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[sub.status] ?? ''}`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(sub.currentPeriodStart), 'MMM d')} – {format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {sub.cancelAtPeriodEnd ? (
                      <span className="text-orange-600 dark:text-orange-400">Yes</span>
                    ) : (
                      '—'
                    )}
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
