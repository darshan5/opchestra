'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function NewServicePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [pricingType, setPricingType] = useState('ONE_TIME');
  const [recurringInterval, setRecurringInterval] = useState('MONTHLY');
  const [setupFee, setSetupFee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [published, setPublished] = useState(false);

  const init = useCallback(async () => {
    const wsRes = await fetch('/api/workspaces');
    const workspaces = await wsRes.json();
    const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
    if (ws) setWorkspaceId(ws.id);
  }, [slug]);

  useEffect(() => {
    init();
  }, [init]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !name.trim()) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          price: parseFloat(price) || 0,
          currency,
          pricingType,
          recurringInterval: pricingType === 'RECURRING' ? recurringInterval : null,
          setupFee: setupFee ? parseFloat(setupFee) : null,
          deadline: deadline ? parseInt(deadline, 10) : null,
          published,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/app/${slug}/services/${data.id}`);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to create service.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Service</h1>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            autoFocus
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Website Design Package"
            required
            value={name}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this service includes..."
            rows={3}
            value={description}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Price
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              min="0"
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
              type="number"
              value={price}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Currency
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setCurrency(e.target.value)}
              value={currency}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pricing Type
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setPricingType(e.target.value)}
              value={pricingType}
            >
              <option value="ONE_TIME">One-time</option>
              <option value="RECURRING">Recurring</option>
            </select>
          </div>
          {pricingType === 'RECURRING' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Billing Interval
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onChange={(e) => setRecurringInterval(e.target.value)}
                value={recurringInterval}
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Setup Fee
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              min="0"
              onChange={(e) => setSetupFee(e.target.value)}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={setupFee}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Deadline (business days)
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              min="1"
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="e.g. 5"
              type="number"
              value={deadline}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Published</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Visible to clients in the service catalog.
            </p>
          </div>
          <button
            className={`relative h-6 w-11 rounded-full transition-colors ${published ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
            onClick={() => setPublished(!published)}
            type="button"
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${published ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={saving || !name.trim()}
            type="submit"
          >
            {saving ? 'Creating...' : 'Create Service'}
          </button>
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => router.push(`/app/${slug}/services`)}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
