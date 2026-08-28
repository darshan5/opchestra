'use client';

import { format } from 'date-fns';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface ClientLTV {
  clientId: string;
  name: string | null;
  email: string;
  totalOrders: number;
  totalSpent: number;
  firstOrderDate: string | null;
}

export default function ClientReportsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientLTV[]>([]);

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

      const byClient = new Map<string, ClientLTV>();
      for (const order of orders) {
        const key = order.clientId ?? 'unknown';
        const name = order.client?.name ?? null;
        const email = order.client?.email ?? 'Unknown';
        const existing = byClient.get(key) ?? { clientId: key, name, email, totalOrders: 0, totalSpent: 0, firstOrderDate: null };
        existing.totalOrders++;
        existing.totalSpent += order.totalPrice ?? 0;
        if (!existing.firstOrderDate || order.createdAt < existing.firstOrderDate) {
          existing.firstOrderDate = order.createdAt;
        }
        byClient.set(key, existing);
      }

      setClients(Array.from(byClient.values()).sort((a, b) => b.totalSpent - a.totalSpent));
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Lifetime Value</h1>

      {clients.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No client order data yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Orders</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Lifetime Value</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">First Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {clients.map((c) => (
                <tr key={c.clientId}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{c.name ?? '—'}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.totalOrders}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">${c.totalSpent.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {c.firstOrderDate ? format(new Date(c.firstOrderDate), 'MMM d, yyyy') : '—'}
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
