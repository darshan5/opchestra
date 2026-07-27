'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
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

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetch(`/api/workspaces/${ws.id}/companies`).then((r) => r.json()).then(setCompanies);
          fetch(`/api/workspaces/${ws.id}/contacts`).then((r) => r.json()).then(setContacts);
        }
      });
  }, [params.slug]);

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...items];
    (updated[index] as unknown as Record<string, unknown>)[field] = value;
    if (field === 'quantity' || field === 'rate') {
      updated[index].amount = updated[index].quantity * updated[index].rate;
    }
    setItems(updated);
  }

  function addItem() {
    setItems([...items, { amount: 0, description: '', quantity: 1, rate: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  }

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const filteredContacts = companyId
    ? contacts.filter((c) => c.companyId === companyId)
    : contacts;

  async function handleSubmit(sendNow: boolean) {
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        body: JSON.stringify({
          companyId: companyId || undefined,
          contactId: contactId || undefined,
          dueDate: dueDate || undefined,
          issueDate,
          items: items.filter((i) => i.description.trim()),
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
            Company
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
            Contact
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
        <table className="mt-3 w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase">
                Description
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
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item, i) => (
              <tr key={i}>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    placeholder="Description"
                    value={item.description}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    min="0"
                    onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                    step="0.5"
                    type="number"
                    value={item.quantity}
                  />
                </td>
                <td className="px-2 py-1">
                  <input
                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    min="0"
                    onChange={(e) => updateItem(i, 'rate', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    type="number"
                    value={item.rate}
                  />
                </td>
                <td className="px-2 py-1 text-right text-sm font-medium text-gray-900 dark:text-white">
                  ${item.amount.toFixed(2)}
                </td>
                <td className="px-2 py-1">
                  <button
                    className="text-xs text-red-500 hover:text-red-700"
                    onClick={() => removeItem(i)}
                    type="button"
                  >
                    X
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
          onClick={addItem}
          type="button"
        >
          + Add line item
        </button>
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
    </div>
  );
}
