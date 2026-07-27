'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceAnnual: number;
  maxUsers: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    maxUsers: '3',
    name: '',
    priceAnnual: '0',
    priceMonthly: '0',
    sortOrder: '0',
    stripePriceIdAnnual: '',
    stripePriceIdMonthly: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/plans')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function resetForm() {
    setForm({
      description: '',
      maxUsers: '3',
      name: '',
      priceAnnual: '0',
      priceMonthly: '0',
      sortOrder: '0',
      stripePriceIdAnnual: '',
      stripePriceIdMonthly: '',
    });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(plan: Plan) {
    setForm({
      description: plan.description ?? '',
      maxUsers: String(plan.maxUsers),
      name: plan.name,
      priceAnnual: String(plan.priceAnnual),
      priceMonthly: String(plan.priceMonthly),
      sortOrder: String(plan.sortOrder),
      stripePriceIdAnnual: plan.stripePriceIdAnnual ?? '',
      stripePriceIdMonthly: plan.stripePriceIdMonthly ?? '',
    });
    setEditId(plan.id);
    setShowForm(true);
  }

  async function savePlan() {
    setSaving(true);
    const data = {
      description: form.description || null,
      maxUsers: parseInt(form.maxUsers, 10),
      name: form.name,
      priceAnnual: parseFloat(form.priceAnnual),
      priceMonthly: parseFloat(form.priceMonthly),
      sortOrder: parseInt(form.sortOrder, 10),
      stripePriceIdAnnual: form.stripePriceIdAnnual || null,
      stripePriceIdMonthly: form.stripePriceIdMonthly || null,
    };

    const url = editId ? `/api/admin/plans/${editId}` : '/api/admin/plans';
    const method = editId ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      method,
    });

    if (res.ok) {
      const plan = await res.json();
      if (editId) {
        setPlans(plans.map((p) => (p.id === editId ? plan : p)));
      } else {
        setPlans([...plans, plan]);
      }
      resetForm();
    }
    setSaving(false);
  }

  async function toggleActive(plan: Plan) {
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      body: JSON.stringify({ isActive: !plan.isActive }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    if (res.ok) {
      const updated = await res.json();
      setPlans(plans.map((p) => (p.id === plan.id ? updated : p)));
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plans</h1>
        <Button onClick={() => setShowForm(true)}>New Plan</Button>
      </div>

      {showForm && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
            {editId ? 'Edit Plan' : 'New Plan'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="name"
              label="Name"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Starter"
              value={form.name}
            />
            <Input
              id="description"
              label="Description"
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="For small teams"
              value={form.description}
            />
            <Input
              id="priceMonthly"
              label="Monthly Price ($)"
              onChange={(e) => setForm({ ...form, priceMonthly: e.target.value })}
              type="number"
              value={form.priceMonthly}
            />
            <Input
              id="priceAnnual"
              label="Annual Price ($)"
              onChange={(e) => setForm({ ...form, priceAnnual: e.target.value })}
              type="number"
              value={form.priceAnnual}
            />
            <Input
              id="maxUsers"
              label="Max Users"
              onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
              type="number"
              value={form.maxUsers}
            />
            <Input
              id="sortOrder"
              label="Sort Order"
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              type="number"
              value={form.sortOrder}
            />
            <Input
              id="stripePriceIdMonthly"
              label="Stripe Monthly Price ID"
              onChange={(e) => setForm({ ...form, stripePriceIdMonthly: e.target.value })}
              placeholder="price_..."
              value={form.stripePriceIdMonthly}
            />
            <Input
              id="stripePriceIdAnnual"
              label="Stripe Annual Price ID"
              onChange={(e) => setForm({ ...form, stripePriceIdAnnual: e.target.value })}
              placeholder="price_..."
              value={form.stripePriceIdAnnual}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={saving} onClick={savePlan}>
              {editId ? 'Update' : 'Create'}
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
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Monthly
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Annual
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Max Users
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Stripe
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                  {plan.name}
                  {plan.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{plan.description}</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  ${plan.priceMonthly}/mo
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  ${plan.priceAnnual}/yr
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {plan.maxUsers}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      plan.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400">
                  {plan.stripePriceIdMonthly ? 'Configured' : 'Not set'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      onClick={() => startEdit(plan)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-xs text-gray-500 hover:underline dark:text-gray-400"
                      onClick={() => toggleActive(plan)}
                    >
                      {plan.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={7}>
                  No plans created yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
