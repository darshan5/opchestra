'use client';

import { formatDistanceToNow } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Discount {
  id: string;
  code: string;
  description: string | null;
  type: string;
  percentOff: number;
  billingScope: string;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
  createdAt: string;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [percentOff, setPercentOff] = useState('10');
  const [type, setType] = useState('LIFETIME');
  const [billingScope, setBillingScope] = useState('BOTH');
  const [maxUses, setMaxUses] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchDiscounts = useCallback(async () => {
    const res = await fetch('/api/admin/discounts');
    if (res.ok) {
      setDiscounts(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  function resetForm() {
    setEditingId(null);
    setCode('');
    setDescription('');
    setPercentOff('10');
    setType('LIFETIME');
    setBillingScope('BOTH');
    setMaxUses('');
    setStartsAt('');
    setExpiresAt('');
    setShowForm(false);
  }

  function openEdit(d: Discount) {
    setEditingId(d.id);
    setCode(d.code);
    setDescription(d.description || '');
    setPercentOff(String(d.percentOff));
    setType(d.type);
    setBillingScope(d.billingScope);
    setMaxUses(d.maxUses !== null ? String(d.maxUses) : '');
    setStartsAt(d.startsAt ? new Date(d.startsAt).toISOString().slice(0, 16) : '');
    setExpiresAt(d.expiresAt ? new Date(d.expiresAt).toISOString().slice(0, 16) : '');
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    const payload = {
      code,
      description: description || undefined,
      percentOff: parseInt(percentOff, 10),
      type,
      billingScope,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
    };

    const res = editingId
      ? await fetch(`/api/admin/discounts/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/admin/discounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      resetForm();
      fetchDiscounts();
      setMessage(editingId ? 'Discount updated' : 'Discount created');
    } else {
      setMessage('Failed to save');
    }
    setSaving(false);
  }

  async function toggleActive(d: Discount) {
    await fetch(`/api/admin/discounts/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    fetchDiscounts();
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discount Codes</h1>
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          New Discount
        </Button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      {showForm && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {editingId ? 'Edit Discount' : 'Create Discount'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              id="code"
              label="Code"
              onChange={(e) => setCode(e.target.value)}
              placeholder="BETA50"
              value={code}
            />
            <Input
              id="description"
              label="Description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              value={description}
            />
            <Input
              id="percentOff"
              label="Percent Off"
              max={100}
              min={1}
              onChange={(e) => setPercentOff(e.target.value)}
              type="number"
              value={percentOff}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                onChange={(e) => setType(e.target.value)}
                value={type}
              >
                <option value="LIFETIME">Lifetime</option>
                <option value="FIRST_YEAR">First Year</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Billing Scope
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                onChange={(e) => setBillingScope(e.target.value)}
                value={billingScope}
              >
                <option value="BOTH">Both</option>
                <option value="MONTHLY">Monthly Only</option>
                <option value="ANNUAL">Annual Only</option>
              </select>
            </div>
            <Input
              id="maxUses"
              label="Max Uses (empty = unlimited)"
              min={1}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              type="number"
              value={maxUses}
            />
            <Input
              id="startsAt"
              label="Starts At"
              onChange={(e) => setStartsAt(e.target.value)}
              type="datetime-local"
              value={startsAt}
            />
            <Input
              id="expiresAt"
              label="Expires At"
              onChange={(e) => setExpiresAt(e.target.value)}
              type="datetime-local"
              value={expiresAt}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button disabled={!code.trim()} loading={saving} onClick={handleSave}>
              {editingId ? 'Save Changes' : 'Create Discount'}
            </Button>
            <Button onClick={resetForm} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Code
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Description
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                % Off
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Type
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Scope
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Starts
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Expires
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Uses
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {discounts.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2.5 font-mono text-sm font-medium text-gray-900 dark:text-white">
                  {d.code}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {d.description || '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">
                  {d.percentOff}%
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {d.type === 'LIFETIME' ? 'Lifetime' : 'First Year'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {d.billingScope}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {new Date(d.startsAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-2.5">
                  {d.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {d.usedCount}
                  {d.maxUses !== null ? `/${d.maxUses}` : ''}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      onClick={() => openEdit(d)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      onClick={() => toggleActive(d)}
                    >
                      {d.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {discounts.length === 0 && (
              <tr>
                <td
                  className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  colSpan={10}
                >
                  No discount codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
