'use client';

import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taskId?: string | null;
  isSection?: boolean;
  isSubItem?: boolean;
  isFlat?: boolean;
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
    category: string | null;
  }>;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [workspaceId, setWorkspaceId] = useState('');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; email: string; companyId: string | null }>>([]);
  const [companyId, setCompanyId] = useState('');
  const [contactId, setContactId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [items, setItems] = useState<LineItem[]>([{ amount: 0, description: '', quantity: 1, rate: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Import tasks
  const [showImport, setShowImport] = useState(false);
  const [importableTasks, setImportableTasks] = useState<ImportableTask[]>([]);
  const [importSearch, setImportSearch] = useState('');
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [loadingImport, setLoadingImport] = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetch(`/api/workspaces/${ws.id}/companies`).then((r) => r.json()).then(setCompanies);
          fetch(`/api/workspaces/${ws.id}/contacts`).then((r) => r.json()).then(setContacts);
          fetch(`/api/workspaces/${ws.id}/settings`).then((r) => r.json()).then((settings) => {
            if (settings.invoiceDefaultTaxRate) {
              setTaxRate(settings.invoiceDefaultTaxRate);
            }
          });

          const paymentDueDays = ws.invoicePaymentDueDays ?? 30;
          const due = new Date();
          due.setDate(due.getDate() + paymentDueDays);
          setDueDate(due.toISOString().split('T')[0]);
        }
      });
  }, [params.slug]);

  function updateItem(index: number, field: keyof LineItem, value: string | number | boolean) {
    const updated = [...items];
    (updated[index] as unknown as Record<string, unknown>)[field] = value;
    if (field === 'isFlat') {
      if (value) {
        updated[index].quantity = 1;
        updated[index].rate = updated[index].amount;
      } else {
        updated[index].amount = updated[index].quantity * updated[index].rate;
      }
    } else if (field === 'amount' && updated[index].isFlat) {
      updated[index].rate = updated[index].amount;
    } else if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    setItems(updated);
  }

  function addItem() {
    setItems([...items, { amount: 0, description: '', quantity: 1, rate: 0 }]);
  }

  function addSection() {
    setItems([...items, { amount: 0, description: '', quantity: 0, rate: 0, isSection: true }]);
  }

  function addSubItem(parentIndex: number) {
    const updated = [...items];
    let insertAt = parentIndex + 1;
    while (insertAt < updated.length && updated[insertAt].isSubItem) {
      insertAt++;
    }
    updated.splice(insertAt, 0, { amount: 0, description: '', quantity: 1, rate: 0, isSubItem: true });
    setItems(updated);
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const updated = [...items];
    const item = updated[index];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    if (item.isSubItem) {
      const target = updated[targetIdx];
      if (!target.isSubItem && direction === 'up') return;
      if (!target.isSubItem && direction === 'down') return;
    }
    updated.splice(index, 1);
    updated.splice(targetIdx, 0, item);
    setItems(updated);
  }

  function removeItem(index: number) {
    const item = items[index];
    if (item.isSection) {
      let endIdx = index + 1;
      while (endIdx < items.length && !items[endIdx].isSection) {
        endIdx++;
      }
      setItems(items.filter((_, i) => i < index || i >= endIdx));
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.isSection ? 0 : item.amount), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const filteredContacts = companyId
    ? contacts.filter((c) => c.companyId === companyId)
    : contacts;

  const fetchImportableTasks = useCallback(async () => {
    if (!workspaceId) return;
    setLoadingImport(true);
    const qp = new URLSearchParams();
    if (companyId) qp.set('companyId', companyId);
    if (importSearch) qp.set('search', importSearch);
    if (importDate) qp.set('date', importDate);
    const res = await fetch(`/api/workspaces/${workspaceId}/invoices/importable-tasks?${qp}`);
    if (res.ok) {
      setImportableTasks(await res.json());
    }
    setLoadingImport(false);
  }, [workspaceId, companyId, importSearch, importDate]);

  useEffect(() => {
    if (showImport) {
      fetchImportableTasks();
    }
  }, [showImport, fetchImportableTasks]);

  function handleImportTasks() {
    const newItems: LineItem[] = [...items.filter((i) => i.description.trim())];
    for (const task of importableTasks.filter((t) => selectedTaskIds.has(t.id))) {
      newItems.push({
        description: task.title,
        quantity: 0,
        rate: 0,
        amount: 0,
        taskId: task.id,
      });
      for (const te of task.timeEntries) {
        const catLabel = te.category ? `[${te.category}] ` : '';
        const desc = te.notes
          ? `  · ${catLabel}${te.notes} (${format(new Date(te.date), 'MMM d')})`
          : `  · ${catLabel}Time logged on ${format(new Date(te.date), 'MMM d')}`;
        newItems.push({
          description: desc,
          quantity: te.hours,
          rate: task.hourlyRate,
          amount: Math.round(te.hours * task.hourlyRate * 100) / 100,
          taskId: task.id,
          isSubItem: true,
        });
      }
    }
    if (newItems.length === 0) {
      newItems.push({ amount: 0, description: '', quantity: 1, rate: 0 });
    }
    setItems(newItems);
    setShowImport(false);
    setSelectedTaskIds(new Set());
  }

  async function handleSubmit(sendNow: boolean) {
    setError('');

    if (!companyId) {
      setError('Company is required');
      return;
    }
    if (!contactId) {
      setError('Contact is required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        body: JSON.stringify({
          companyId,
          contactId,
          dueDate: dueDate || undefined,
          issueDate,
          items: items.filter((i) => i.description.trim() || i.isSection).map((i) => ({
            description: i.description,
            quantity: i.quantity,
            rate: i.rate,
            amount: i.amount,
            taskId: i.taskId || undefined,
            isSection: i.isSection || undefined,
            isSubItem: i.isSubItem || undefined,
            isFlat: i.isFlat || undefined,
          })),
          notes: notes || undefined,
          tax: taxRate,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (sendNow) {
        await fetch(`/api/workspaces/${workspaceId}/invoices/${data.id}/send`, { method: 'POST' });
      }

      router.push(`/app/${params.slug}/invoicing/${data.id}`);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Invoice</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Company <span className="text-red-500">*</span>
          </label>
          <select
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            onChange={(e) => setCompanyId(e.target.value)}
            value={companyId}
          >
            <option value="">Select company...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Contact <span className="text-red-500">*</span>
          </label>
          <select
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            onChange={(e) => setContactId(e.target.value)}
            value={contactId}
          >
            <option value="">Select contact...</option>
            {filteredContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
        </div>

        <Input
          id="issueDate"
          label="Issue Date"
          onChange={(e) => setIssueDate(e.target.value)}
          type="date"
          value={issueDate}
        />
        <Input
          id="dueDate"
          label="Due Date"
          onChange={(e) => setDueDate(e.target.value)}
          type="date"
          value={dueDate}
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
          <button
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            onClick={() => setShowImport(true)}
            type="button"
          >
            Import Tasks
          </button>
        </div>
        <table className="mt-3 w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="w-8" />
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="w-16 px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="w-24 px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">
                Qty
              </th>
              <th className="w-28 px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">
                Rate
              </th>
              <th className="w-28 px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item, i) => {
              const isSection = item.isSection;
              const isSubItem = item.isSubItem;
              const isTaskHeader = !isSection && !isSubItem && item.quantity === 0 && item.rate === 0 && item.amount === 0 && item.taskId;
              const isHeaderLike = isSection || isTaskHeader;
              const isFlat = item.isFlat;
              return (
                <tr
                  key={i}
                  className={cn(
                    isSection && 'bg-blue-50 dark:bg-blue-950/30',
                    isTaskHeader && 'bg-gray-50 dark:bg-gray-900/50',
                  )}
                >
                  <td className="px-1 py-1">
                    <div className="flex flex-col items-center">
                      <button
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-0 dark:text-gray-600 dark:hover:text-gray-300"
                        disabled={i === 0}
                        onClick={() => moveItem(i, 'up')}
                        type="button"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-0 dark:text-gray-600 dark:hover:text-gray-300"
                        disabled={i === items.length - 1}
                        onClick={() => moveItem(i, 'down')}
                        type="button"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1">
                      {!isSection && !isSubItem && !isTaskHeader && (
                        <button
                          className="shrink-0 text-gray-300 hover:text-blue-600 dark:text-gray-600 dark:hover:text-blue-400"
                          onClick={() => addSubItem(i)}
                          title="Add sub-item"
                          type="button"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isSubItem && <span className="ml-6 shrink-0 text-gray-400">·</span>}
                      {isTaskHeader && <span className="ml-5 shrink-0" />}
                      <input
                        className={cn(
                          'w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white',
                          isSection && 'font-bold text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                          isTaskHeader && 'font-semibold',
                          isSubItem && 'text-gray-600 dark:text-gray-400',
                        )}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                        placeholder={isSection ? 'Section name' : isSubItem ? 'Sub-item description' : 'Description'}
                        value={item.description}
                      />
                    </div>
                  </td>
                  <td className="px-1 py-1 text-center">
                    {!isHeaderLike && (
                      <button
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-medium',
                          isFlat
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                        )}
                        onClick={() => updateItem(i, 'isFlat', !isFlat)}
                        title={isFlat ? 'Switch to hourly rate' : 'Switch to flat price'}
                        type="button"
                      >
                        {isFlat ? 'Flat' : 'Hourly'}
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    {!isHeaderLike && !isFlat && (
                      <input
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        min="0"
                        onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        step="0.5"
                        type="number"
                        value={item.quantity}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1">
                    {!isHeaderLike && !isFlat && (
                      <input
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        min="0"
                        onChange={(e) => updateItem(i, 'rate', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        type="number"
                        value={item.rate}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1 text-right text-sm font-medium text-gray-900 dark:text-white">
                    {isHeaderLike ? '' : isFlat ? (
                      <input
                        className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        min="0"
                        onChange={(e) => updateItem(i, 'amount', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        type="number"
                        value={item.amount}
                      />
                    ) : `$${item.amount.toFixed(2)}`}
                  </td>
                  <td className="px-1 py-1">
                    <button
                      className="text-xs text-red-400 hover:text-red-600"
                      onClick={() => removeItem(i)}
                      title={isSection ? 'Remove section and its items' : 'Remove item'}
                      type="button"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-2 flex items-center gap-3">
          <button
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            onClick={addItem}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Add line item
          </button>
          <button
            className="flex items-center gap-1 text-sm text-gray-500 hover:underline dark:text-gray-400"
            onClick={addSection}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            Add section
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-white">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Tax (%)</span>
            <input
              className="w-16 rounded border border-gray-200 bg-white px-2 py-0.5 text-right text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              min="0"
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              type="number"
              value={taxRate}
            />
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold dark:border-gray-700">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-gray-900 dark:text-white">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
        <textarea
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Payment terms, thank you note, etc."
          rows={3}
          value={notes}
        />
      </div>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-6 flex gap-3">
        <Button loading={loading} onClick={() => handleSubmit(false)}>
          Save as Draft
        </Button>
        <Button loading={loading} onClick={() => handleSubmit(true)} variant="secondary">
          Save & Send
        </Button>
        <Button onClick={() => router.back()} variant="ghost">
          Cancel
        </Button>
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
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setImportDate(e.target.value)}
                  type="date"
                  value={importDate}
                />
                <input
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setImportSearch(e.target.value)}
                  placeholder="Search tasks..."
                  value={importSearch}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Showing tasks completed within 90 days of the selected date
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
