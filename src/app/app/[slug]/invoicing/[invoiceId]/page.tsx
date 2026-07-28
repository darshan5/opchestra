'use client';

import { format } from 'date-fns';
import { ExternalLink, Plus, Save, Trash2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taskId?: string | null;
  projectId?: string | null;
}

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
  items: LineItem[];
}

interface ImportableTask {
  id: string;
  title: string;
  projectName: string | null;
  assigneeName: string | null;
  companyId: string | null;
  companyName: string | null;
  hourlyRate: number;
  totalHours: number;
  totalMinutes: number;
  timeEntries: Array<{
    id: string;
    duration: number;
    hours: number;
    date: string;
    notes: string | null;
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
  const [userRole, setUserRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Editable state
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);

  // Dropdowns data
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; email: string; companyId: string | null }>>([]);

  // Import tasks
  const [showImport, setShowImport] = useState(false);
  const [importableTasks, setImportableTasks] = useState<ImportableTask[]>([]);
  const [importSearch, setImportSearch] = useState('');
  const [importCompanyFilter, setImportCompanyFilter] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [loadingImport, setLoadingImport] = useState(false);

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN' || userRole === 'MANAGER';
  const isEditable = isAdmin && invoice?.status === 'DRAFT';

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          Promise.all([
            fetch(`/api/workspaces/${ws.id}/invoices/${params.invoiceId}`).then((r) => r.json()),
            fetch(`/api/workspaces/${ws.id}/members`).then((r) => r.json()),
            fetch(`/api/workspaces/${ws.id}/companies`).then((r) => r.json()),
            fetch(`/api/workspaces/${ws.id}/contacts`).then((r) => r.json()),
          ]).then(([inv, members, comps, conts]) => {
            setInvoice(inv);
            setCompanies(comps);
            setContacts(conts);
            syncFormState(inv);
            const me = members.find((m: { user: { id: string } }) => m.user.id === inv.workspace?.userId);
            if (!me) {
              fetch('/api/auth/session').then((r) => r.json()).then((sess) => {
                const myMembership = members.find((m: { user: { id: string } }) => m.user.id === sess?.user?.id);
                if (myMembership) {
                  setUserRole(myMembership.role);
                }
              });
            } else {
              setUserRole(me.role);
            }
          });
        }
      });
  }, [params.slug, params.invoiceId]);

  function syncFormState(inv: InvoiceDetail) {
    setCompanyId(inv.company?.id ?? '');
    setContactId(inv.contact?.id ?? '');
    setIssueDate(inv.issueDate ? format(new Date(inv.issueDate), 'yyyy-MM-dd') : '');
    setDueDate(inv.dueDate ? format(new Date(inv.dueDate), 'yyyy-MM-dd') : '');
    setNotes(inv.notes ?? '');
    const sub = inv.subtotal || 0;
    setTaxRate(sub > 0 ? Math.round(((inv.tax || 0) / sub) * 10000) / 100 : 0);
    setItems(inv.items.map((it) => ({ ...it })));
    setDirty(false);
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...items];
    (updated[index] as unknown as Record<string, unknown>)[field] = value;
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    setItems(updated);
    setDirty(true);
  }

  function addItem() {
    setItems([...items, { description: '', quantity: 1, rate: 0, amount: 0 }]);
    setDirty(true);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
    setDirty(true);
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const filteredContacts = companyId
    ? contacts.filter((c) => c.companyId === companyId)
    : contacts;

  async function saveInvoice() {
    if (!workspaceId || !invoice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invoices/${invoice.id}`, {
        body: JSON.stringify({
          companyId: companyId || null,
          contactId: contactId || null,
          issueDate,
          dueDate: dueDate || null,
          notes: notes || null,
          taxRate,
          items: items.filter((i) => i.description.trim()).map((i) => ({
            description: i.description,
            quantity: i.quantity,
            rate: i.rate,
            amount: i.amount,
            taskId: i.taskId || null,
            projectId: i.projectId || null,
          })),
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoice({ ...invoice, ...updated });
        syncFormState({ ...invoice, ...updated });
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(status: string) {
    if (!workspaceId || !invoice) return;
    setLoading(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/invoices/${invoice.id}`, {
      body: JSON.stringify({ status }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    if (res.ok) {
      const updated = await res.json();
      setInvoice({ ...invoice, ...updated });
      syncFormState({ ...invoice, ...updated });
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
      const updated = await res.json();
      setInvoice(updated);
      syncFormState(updated);
    }
    setLoading(false);
  }

  async function deleteInvoice() {
    await fetch(`/api/workspaces/${workspaceId}/invoices/${params.invoiceId}`, {
      method: 'DELETE',
    });
    router.push(`/app/${params.slug}/invoicing`);
  }

  const fetchImportableTasks = useCallback(async () => {
    if (!workspaceId) return;
    setLoadingImport(true);
    const qp = new URLSearchParams();
    if (importCompanyFilter) qp.set('companyId', importCompanyFilter);
    if (importSearch) qp.set('search', importSearch);
    const res = await fetch(`/api/workspaces/${workspaceId}/invoices/importable-tasks?${qp}`);
    if (res.ok) {
      setImportableTasks(await res.json());
    }
    setLoadingImport(false);
  }, [workspaceId, importCompanyFilter, importSearch]);

  useEffect(() => {
    if (showImport) {
      fetchImportableTasks();
    }
  }, [showImport, fetchImportableTasks]);

  function handleImportTasks() {
    const newItems: LineItem[] = [...items];
    for (const task of importableTasks.filter((t) => selectedTaskIds.has(t.id))) {
      newItems.push({
        description: task.title,
        quantity: 0,
        rate: 0,
        amount: 0,
        taskId: task.id,
      });
      for (const te of task.timeEntries) {
        const desc = te.notes
          ? `  · ${te.notes} (${format(new Date(te.date), 'MMM d')})`
          : `  · Time logged on ${format(new Date(te.date), 'MMM d')}`;
        newItems.push({
          description: desc,
          quantity: te.hours,
          rate: task.hourlyRate,
          amount: Math.round(te.hours * task.hourlyRate * 100) / 100,
          taskId: task.id,
        });
      }
    }
    setItems(newItems);
    setDirty(true);
    setShowImport(false);
    setSelectedTaskIds(new Set());
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
      {/* Header */}
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
          {isEditable && dirty && (
            <Button loading={saving} onClick={saveInvoice}>
              <Save className="mr-1 h-4 w-4" />
              Save
            </Button>
          )}
          {invoice.status === 'DRAFT' && isAdmin && (
            <>
              <Button loading={loading} onClick={sendInvoice}>
                Send
              </Button>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-1.5 dark:border-red-800 dark:bg-red-950">
                  <span className="text-sm text-red-700 dark:text-red-300">Delete?</span>
                  <Button onClick={deleteInvoice} size="sm" variant="danger">Confirm</Button>
                  <Button onClick={() => setShowDeleteConfirm(false)} size="sm" variant="ghost">Cancel</Button>
                </div>
              ) : (
                <Button onClick={() => setShowDeleteConfirm(true)} variant="danger">
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              )}
            </>
          )}
          {invoice.status === 'SENT' && isAdmin && (
            <Button loading={loading} onClick={() => updateStatus('PAID')}>
              Mark as Paid
            </Button>
          )}
          {(invoice.status === 'DRAFT' || invoice.status === 'SENT') && isAdmin && (
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

      {/* Company / Contact */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">From</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
            {invoice.workspace.name}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Bill To</p>
          {isEditable ? (
            <div className="mt-1 space-y-2">
              <select
                className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onChange={(e) => { setCompanyId(e.target.value); setDirty(true); }}
                value={companyId}
              >
                <option value="">Select company...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onChange={(e) => { setContactId(e.target.value); setDirty(true); }}
                value={contactId}
              >
                <option value="">Select contact...</option>
                {filteredContacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Issue Date</p>
          {isEditable ? (
            <input
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => { setIssueDate(e.target.value); setDirty(true); }}
              type="date"
              value={issueDate}
            />
          ) : (
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
          {isEditable ? (
            <input
              className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => { setDueDate(e.target.value); setDirty(true); }}
              type="date"
              value={dueDate}
            />
          ) : (
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'}
            </p>
          )}
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

      {/* Line Items */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
          {isEditable && (
            <div className="flex gap-2">
              <button
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                onClick={() => setShowImport(true)}
                type="button"
              >
                Import Tasks
              </button>
            </div>
          )}
        </div>
        <table className="mt-3 w-full">
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
              {isEditable && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item, i) => {
              const isHeader = item.quantity === 0 && item.rate === 0 && item.amount === 0 && !item.description.startsWith('  ·');
              return (
                <tr key={i} className={isHeader ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                  <td className="px-4 py-2.5">
                    {isEditable ? (
                      <input
                        className={cn(
                          'w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white',
                          isHeader && 'font-semibold',
                        )}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                        value={item.description}
                      />
                    ) : (
                      <span className={cn('text-sm text-gray-900 dark:text-white', isHeader && 'font-semibold')}>
                        {item.description}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditable && !isHeader ? (
                      <input
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        min="0"
                        onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        step="0.5"
                        type="number"
                        value={item.quantity}
                      />
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {isHeader ? '' : item.quantity}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {isEditable && !isHeader ? (
                      <input
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        min="0"
                        onChange={(e) => updateItem(i, 'rate', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        type="number"
                        value={item.rate}
                      />
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {isHeader ? '' : `$${item.rate.toFixed(2)}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {isHeader ? '' : `$${item.amount.toFixed(2)}`}
                  </td>
                  {isEditable && (
                    <td className="px-2 py-2.5">
                      <button
                        className="text-xs text-red-500 hover:text-red-700"
                        onClick={() => removeItem(i)}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {isEditable && (
          <button
            className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            onClick={addItem}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Add line item
          </button>
        )}
      </div>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Tax (%)</span>
            {isEditable ? (
              <input
                className="w-16 rounded border border-gray-200 bg-white px-2 py-0.5 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                min="0"
                onChange={(e) => { setTaxRate(parseFloat(e.target.value) || 0); setDirty(true); }}
                type="number"
                value={taxRate}
              />
            ) : (
              <span className="text-gray-900 dark:text-white">${(invoice.tax || 0).toFixed(2)}</span>
            )}
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-1 text-base font-bold dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-gray-900 dark:text-white">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6">
        {isEditable ? (
          <>
            <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Notes</p>
            <textarea
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Payment terms, thank you note, etc."
              rows={3}
              value={notes}
            />
          </>
        ) : (
          invoice.notes && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium tracking-wider text-gray-500 uppercase">Notes</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{invoice.notes}</p>
            </div>
          )
        )}
      </div>

      {/* Import Tasks Dialog */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Tasks</h3>
              <button onClick={() => setShowImport(false)} type="button">
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-3">
              <div className="flex gap-3">
                <input
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setImportSearch(e.target.value)}
                  placeholder="Search tasks..."
                  value={importSearch}
                />
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setImportCompanyFilter(e.target.value)}
                  value={importCompanyFilter}
                >
                  <option value="">All companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Showing completed tasks from last 90 days with billable time entries
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto px-6">
              {loadingImport ? (
                <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
              ) : importableTasks.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No importable tasks found</p>
              ) : (
                <div className="space-y-1">
                  {importableTasks.map((task) => (
                    <label
                      className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"
                      key={task.id}
                    >
                      <input
                        checked={selectedTaskIds.has(task.id)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                        onChange={(e) => {
                          const next = new Set(selectedTaskIds);
                          if (e.target.checked) next.add(task.id);
                          else next.delete(task.id);
                          setSelectedTaskIds(next);
                        }}
                        type="checkbox"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {task.projectName && <span>{task.projectName}</span>}
                          {task.companyName && <span>· {task.companyName}</span>}
                          <span>· {task.totalHours}h logged</span>
                          <span>· {task.timeEntries.length} entries</span>
                          {task.hourlyRate > 0 && <span>· ${task.hourlyRate}/hr</span>}
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${(task.totalHours * task.hourlyRate).toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setShowImport(false)} variant="ghost">Cancel</Button>
                <Button
                  disabled={selectedTaskIds.size === 0}
                  onClick={handleImportTasks}
                >
                  Import Selected
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
