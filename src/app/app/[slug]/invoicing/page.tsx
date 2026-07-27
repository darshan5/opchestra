'use client';

import { formatDistanceToNow } from 'date-fns';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  issueDate: string;
  dueDate: string | null;
  company: { id: string; name: string } | null;
  contact: { id: string; name: string; email: string } | null;
}

const STATUS_TABS = ['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

const statusColors: Record<string, string> = {
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

export default function InvoicingPage() {
  const params = useParams<{ slug: string }>();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
        }
      });
  }, [params.slug]);

  const fetchInvoices = useCallback(async (wsId: string, tab: string, q: string) => {
    const qp = new URLSearchParams();
    if (tab !== 'ALL') {
      qp.set('status', tab);
    }
    if (q) {
      qp.set('search', q);
    }
    const res = await fetch(`/api/workspaces/${wsId}/invoices?${qp}`);
    if (res.ok) {
      setInvoices(await res.json());
    }
  }, []);

  useEffect(() => {
    if (workspaceId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchInvoices(workspaceId, activeTab, search);
    }
  }, [workspaceId, activeTab, search, fetchInvoices]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
        <Link href={`/app/${params.slug}/invoicing/new`}>
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice # or client..."
            type="text"
            value={search}
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Invoice #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Client
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Issued
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Due
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoices.map((inv) => (
              <tr
                className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                key={inv.id}
                onClick={() =>
                  (window.location.href = `/app/${params.slug}/invoicing/${inv.id}`)
                }
              >
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                  {inv.invoiceNumber}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                  {inv.company?.name || inv.contact?.name || '—'}
                </td>
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                  ${inv.total.toFixed(2)}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      statusColors[inv.status] ?? statusColors.DRAFT,
                    )}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(inv.issueDate), { addSuffix: true })}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {inv.dueDate
                    ? formatDistanceToNow(new Date(inv.dueDate), { addSuffix: true })
                    : '—'}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td
                  className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  colSpan={6}
                >
                  No invoices yet. Create your first invoice to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
