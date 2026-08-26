'use client';

import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface SubscriptionRow {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  service: { name: string; price: number; recurringInterval: string | null } | null;
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  PAST_DUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  PAUSED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  PENDING_CANCEL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  CANCELED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function PortalSubscriptionsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const sessRes = await fetch('/api/auth/session');
      const sess = await sessRes.json();
      if (!sess?.user?.id) return;

      const res = await fetch(`/api/workspaces/${ws.id}/subscriptions?clientId=${sess.user.id}`);
      if (res.ok) setSubscriptions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleCancel(subId: string, cancel: boolean) {
    if (!workspaceId) return;
    setUpdating(subId);
    try {
      await fetch(`/api/workspaces/${workspaceId}/subscriptions/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtPeriodEnd: cancel }),
      });
      fetchData();
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscriptions</h1>

      {subscriptions.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No active subscriptions.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {subscriptions.map((sub) => (
            <div
              className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
              key={sub.id}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {sub.service?.name ?? 'Unknown Service'}
                  </h3>
                  {sub.service?.price != null && (
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      ${sub.service.price.toFixed(2)}
                      {sub.service.recurringInterval && `/${sub.service.recurringInterval.toLowerCase()}`}
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[sub.status] ?? ''}`}>
                  {sub.status.replace('_', ' ')}
                </span>
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Current period: {format(new Date(sub.currentPeriodStart), 'MMM d')} – {format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')}
              </div>

              {sub.status === 'ACTIVE' && !sub.cancelAtPeriodEnd && (
                <button
                  className="mt-4 w-full rounded-lg border border-red-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                  disabled={updating === sub.id}
                  onClick={() => toggleCancel(sub.id, true)}
                >
                  {updating === sub.id ? 'Updating...' : 'Cancel at Period End'}
                </button>
              )}

              {(sub.status === 'ACTIVE' || sub.status === 'PENDING_CANCEL') && sub.cancelAtPeriodEnd && (
                <div className="mt-4">
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Cancels on {format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')}
                  </p>
                  <button
                    className="mt-2 w-full rounded-lg border border-green-200 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                    disabled={updating === sub.id}
                    onClick={() => toggleCancel(sub.id, false)}
                  >
                    {updating === sub.id ? 'Updating...' : 'Keep Subscription'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
