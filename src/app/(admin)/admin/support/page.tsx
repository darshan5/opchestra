'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string };
  _count: { messages: number };
}

const priorityColors: Record<string, string> = {
  HIGH: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  LOW: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  URGENT:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  OPEN: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
};

const statuses = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const priorities = ['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'];

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/support')
      .then((r) => r.json())
      .then(setTickets)
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets
    .filter((t) => statusFilter === 'ALL' || t.status === statusFilter)
    .filter((t) => priorityFilter === 'ALL' || t.priority === priorityFilter);

  return (
    <div className="p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage user support requests
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
              )}
              key={s}
              onClick={() => setStatusFilter(s)}
              type="button"
            >
              {s === 'ALL'
                ? `All (${tickets.length})`
                : `${s.replace('_', ' ')} (${tickets.filter((t) => t.status === s).length})`}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {priorities.map((p) => (
            <button
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                priorityFilter === p
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
              )}
              key={p}
              onClick={() => setPriorityFilter(p)}
              type="button"
            >
              {p === 'ALL' ? 'All Priorities' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-500 dark:text-gray-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-12 space-y-2 text-center">
          <MessageCircle className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">No tickets found</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((ticket) => (
            <Link
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
              href={`/admin/support/${ticket.id}`}
              key={ticket.id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {ticket.subject}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {ticket.user.name ?? '—'} &middot; {ticket.user.email} &middot; {ticket.category}{' '}
                  &middot; {new Date(ticket.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-xs font-medium',
                  priorityColors[ticket.priority] ?? '',
                )}
              >
                {ticket.priority}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  statusColors[ticket.status] ?? '',
                )}
              >
                {ticket.status.replace('_', ' ')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
