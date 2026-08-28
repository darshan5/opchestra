'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface ServiceRevenue {
  serviceId: string;
  serviceName: string;
  orderCount: number;
  totalRevenue: number;
}

export default function RevenueReportsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceRevenue[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;

      const [invoicesRes, ordersRes] = await Promise.all([
        fetch(`/api/workspaces/${ws.id}/invoices?status=PAID`),
        fetch(`/api/workspaces/${ws.id}/orders`),
      ]);

      if (invoicesRes.ok) {
        const invoices = await invoicesRes.json();
        const total = Array.isArray(invoices)
          ? invoices.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0)
          : 0;
        setTotalRevenue(total);
      }

      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        if (Array.isArray(orders)) {
          const byService = new Map<string, ServiceRevenue>();
          for (const order of orders) {
            const key = order.serviceId ?? 'unknown';
            const name = order.service?.name ?? 'Unknown Service';
            const existing = byService.get(key) ?? { serviceId: key, serviceName: name, orderCount: 0, totalRevenue: 0 };
            existing.orderCount++;
            existing.totalRevenue += order.totalPrice ?? 0;
            byService.set(key, existing);
          }
          setServiceBreakdown(Array.from(byService.values()).sort((a, b) => b.totalRevenue - a.totalRevenue));
        }
      }
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue</h1>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue (Paid Invoices)</p>
        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">${totalRevenue.toFixed(2)}</p>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900 dark:text-white">By Service</h2>
      {serviceBreakdown.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No orders yet.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Service</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Orders</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {serviceBreakdown.map((s) => (
                <tr key={s.serviceId}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.serviceName}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.orderCount}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">${s.totalRevenue.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
