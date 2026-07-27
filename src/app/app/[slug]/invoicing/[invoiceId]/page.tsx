'use client';

import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  publicKey: string;
  paidAt: string | null;
  sentAt: string | null;
  workspace: { name: string };
  company: { id: string; name: string; domain: string | null } | null;
  contact: { id: string; name: string; email: string; phone: string | null } | null;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

const statusColors: Record<string, string> = {
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams<{ slug: string; invoiceId: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [workspaceId, setWorkspaceId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetch(`/api/workspaces/${ws.id}/invoices/${params.invoiceId}`)
            .then((r) => r.json())
            .then(setInvoice);
        }
      });
  }, [params.slug, params.invoiceId]);

  async function updateStatus(status: string) {
    setLoading(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/invoices/${params.invoiceId}`, {
      body: JSON.stringify({ status }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    if (res.ok) {
      setInvoice(await res.json());
    }
    setLoading(false);
  }

  async function sendInvoice() {
    setLoading(true);
    await fetch(`/api/workspaces/${workspaceId}/invoices/${params.invoiceId}/send`, {
      method: 'POST',
    });
    const res = await fetch(`/api/workspaces/${workspaceId}/invoices/${params.invoiceId}`);
    if (res.ok) {
      setInvoice(await res.json());
    }
    setLoading(false);
  }

  async function deleteInvoice() {
    if (!confirm('Delete this draft invoice?')) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/invoices/${params.invoiceId}`, {
      method: 'DELETE',
    });
    router.push(`/app/${params.slug}/invoicing`);
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const publicUrl = `/invoice/${invoice.publicKey}`;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {invoice.invoiceNumber}
          </h1>
          <span
            className={cn(
              'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
              statusColors[invoice.status] ?? statusColors.DRAFT,
            )}
          >
            {invoice.status}
          </span>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'DRAFT' && (
            <>
              <Button loading={loading} onClick={sendInvoice}>
                Send
              </Button>
              <Button onClick={deleteInvoice} variant="danger">
                Delete
              </Button>
            </>
          )}
          {invoice.status === 'SENT' && (
            <Button loading={loading} onClick={() => updateStatus('PAID')}>
              Mark as Paid
            </Button>
          )}
          {(invoice.status === 'DRAFT' || invoice.status === 'SENT') && (
            <Button loading={loading} onClick={() => updateStatus('CANCELLED')} variant="ghost">
              Cancel
            </Button>
          )}
          <a
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            href={publicUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Public Link
          </a>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">From</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {invoice.workspace.name}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Bill To</p>
          {invoice.company && (
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {invoice.company.name}
            </p>
          )}
          {invoice.contact && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {invoice.contact.name} &middot; {invoice.contact.email}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Issue Date</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'}
          </p>
        </div>
        {invoice.sentAt && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {format(new Date(invoice.sentAt), 'MMM d, yyyy')}
            </p>
          </div>
        )}
        {invoice.paidAt && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {format(new Date(invoice.paidAt), 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Description
              </th>
              <th className="w-24 px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                Qty
              </th>
              <th className="w-28 px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                Rate
              </th>
              <th className="w-28 px-4 py-2 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">
                  {item.description}
                </td>
                <td className="px-4 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">
                  {item.quantity}
                </td>
                <td className="px-4 py-2.5 text-right text-sm text-gray-700 dark:text-gray-300">
                  ${item.rate.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-900 dark:text-white">
                  ${item.amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white">${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Tax</span>
            <span className="text-gray-900 dark:text-white">${invoice.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-gray-900 dark:text-white">${invoice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Notes</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
