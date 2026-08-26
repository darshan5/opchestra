'use client';

import { formatDistanceToNow } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type StatusFilter = 'ALL' | 'PENDING' | 'SUBMITTED' | 'WORKING' | 'COMPLETE';

interface OrderRow {
  id: string;
  status: string;
  priority: number;
  quantity: number;
  totalPrice: number;
  dueDate: string | null;
  createdAt: string;
  service: { name: string } | null;
  client: { name: string | null; email: string } | null;
  assignee: { name: string | null } | null;
}

interface ClientOption {
  userId: string;
  email: string;
  name: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  price: number;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  WORKING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  COMPLETE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  CANCELED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function AdminOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [newClientId, setNewClientId] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [creating, setCreating] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const url = filter === 'ALL'
        ? `/api/workspaces/${ws.id}/orders`
        : `/api/workspaces/${ws.id}/orders?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) setOrders(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug, filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function openCreate() {
    setShowCreate(true);
    if (!workspaceId) return;
    const [cRes, sRes] = await Promise.all([
      fetch(`/api/workspaces/${workspaceId}/clients`),
      fetch(`/api/workspaces/${workspaceId}/services`),
    ]);
    if (cRes.ok) setClients(await cRes.json());
    if (sRes.ok) setServices(await sRes.json());
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientId || !newServiceId || !workspaceId) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newClientId,
          serviceId: newServiceId,
          quantity: newQuantity,
        }),
      });
      if (res.ok) {
        const order = await res.json();
        setShowCreate(false);
        setNewClientId('');
        setNewServiceId('');
        setNewQuantity(1);
        router.push(`/app/${slug}/orders/${order.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  const tabs: Array<{ key: StatusFilter; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'SUBMITTED', label: 'Submitted' },
    { key: 'WORKING', label: 'Working' },
    { key: 'COMPLETE', label: 'Complete' },
  ];

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          Create Order
        </button>
      </div>

      {showCreate && (
        <form
          className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          onSubmit={handleCreate}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Order</h2>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setShowCreate(false)} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setNewClientId(e.target.value)}
              required
              value={newClientId}
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.userId} value={c.userId}>{c.name || c.email}</option>
              ))}
            </select>
            <select
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setNewServiceId(e.target.value)}
              required
              value={newServiceId}
            >
              <option value="">Select service...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>
              ))}
            </select>
            <input
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              min="1"
              onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="Qty"
              type="number"
              value={newQuantity}
            />
          </div>
          <button
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={creating}
            type="submit"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      )}

      <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              filter === t.key
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
            )}
            key={t.key}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No orders found.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Order</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Service</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Assignee</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Due</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {orders.map((order) => (
                <tr
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                  key={order.id}
                  onClick={() => router.push(`/app/${slug}/orders/${order.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {order.service?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {order.client?.name || order.client?.email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[order.status] ?? ''}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {order.assignee?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {order.dueDate ? formatDistanceToNow(new Date(order.dueDate), { addSuffix: true }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
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
