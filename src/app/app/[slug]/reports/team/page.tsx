'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface TeamMember {
  name: string | null;
  email: string;
  ordersCompleted: number;
  totalOrders: number;
}

export default function TeamReportsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;

      const ordersRes = await fetch(`/api/workspaces/${ws.id}/orders`);
      if (!ordersRes.ok) return;
      const orders = await ordersRes.json();
      if (!Array.isArray(orders)) return;

      const byAssignee = new Map<string, TeamMember>();
      for (const order of orders) {
        const key = order.assigneeId ?? 'unassigned';
        const name = order.assignee?.name ?? null;
        const email = order.assignee?.email ?? 'Unassigned';
        const existing = byAssignee.get(key) ?? { name, email, ordersCompleted: 0, totalOrders: 0 };
        existing.totalOrders++;
        if (order.status === 'COMPLETE') existing.ordersCompleted++;
        byAssignee.set(key, existing);
      }

      setMembers(Array.from(byAssignee.values()).sort((a, b) => b.ordersCompleted - a.ordersCompleted));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Performance</h1>

      {members.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No order data yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Team Member</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total Orders</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Completed</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {members.map((m, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{m.name ?? 'Unassigned'}</p>
                    <p className="text-xs text-gray-500">{m.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{m.totalOrders}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{m.ordersCompleted}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {m.totalOrders > 0 ? `${Math.round((m.ordersCompleted / m.totalOrders) * 100)}%` : '—'}
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
