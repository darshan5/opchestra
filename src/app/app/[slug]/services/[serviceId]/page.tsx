'use client';

import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type Tab = 'details' | 'variants' | 'templates';

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  pricingType: string;
  recurringInterval: string | null;
  recurringBehavior: string;
  setupFee: number | null;
  deadline: number | null;
  published: boolean;
  categoryId: string | null;
  autoAssigneeId: string | null;
}

interface Variant {
  id: string;
  name: string;
  price: number;
  options: Record<string, string>;
  position: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  position: number;
  deadlineDays: number | null;
  visibleToClient: boolean;
  assignedToClient: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function ServiceEditorPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const serviceId = params.serviceId as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [tab, setTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [service, setService] = useState<ServiceData | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state for details
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('USD');
  const [pricingType, setPricingType] = useState('ONE_TIME');
  const [recurringInterval, setRecurringInterval] = useState('MONTHLY');
  const [recurringBehavior, setRecurringBehavior] = useState('NO_ACTION');
  const [setupFee, setSetupFee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [published, setPublished] = useState(false);
  const [categoryId, setCategoryId] = useState('');

  // Add variant form
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [variantName, setVariantName] = useState('');
  const [variantPrice, setVariantPrice] = useState('');

  // Add template form
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDeadline, setTemplateDeadline] = useState('');
  const [templateVisible, setTemplateVisible] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const [svcRes, varRes, tplRes, catRes] = await Promise.all([
        fetch(`/api/workspaces/${ws.id}/services/${serviceId}`),
        fetch(`/api/workspaces/${ws.id}/services/${serviceId}/variants`),
        fetch(`/api/workspaces/${ws.id}/services/${serviceId}/templates`),
        fetch(`/api/workspaces/${ws.id}/services/categories`),
      ]);

      if (svcRes.ok) {
        const s = await svcRes.json();
        setService(s);
        setName(s.name);
        setDescription(s.description ?? '');
        setPrice(String(s.price));
        setCurrency(s.currency);
        setPricingType(s.pricingType);
        setRecurringInterval(s.recurringInterval ?? 'MONTHLY');
        setRecurringBehavior(s.recurringBehavior ?? 'NO_ACTION');
        setSetupFee(s.setupFee != null ? String(s.setupFee) : '');
        setDeadline(s.deadline != null ? String(s.deadline) : '');
        setPublished(s.published);
        setCategoryId(s.categoryId ?? '');
      }
      if (varRes.ok) setVariants(await varRes.json());
      if (tplRes.ok) setTemplates(await tplRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } finally {
      setLoading(false);
    }
  }, [slug, serviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveDetails() {
    if (!workspaceId) return;
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/workspaces/${workspaceId}/services/${serviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        currency,
        pricingType,
        recurringInterval: pricingType === 'RECURRING' ? recurringInterval : null,
        recurringBehavior,
        setupFee: setupFee ? parseFloat(setupFee) : null,
        deadline: deadline ? parseInt(deadline, 10) : null,
        published,
        categoryId: categoryId || null,
      }),
    });
    if (res.ok) setMessage('Saved.');
    else setMessage('Failed to save.');
    setSaving(false);
  }

  async function addVariant() {
    if (!workspaceId || !variantName.trim()) return;
    await fetch(`/api/workspaces/${workspaceId}/services/${serviceId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: variantName.trim(),
        price: parseFloat(variantPrice) || 0,
      }),
    });
    setVariantName('');
    setVariantPrice('');
    setShowAddVariant(false);
    fetchData();
  }

  async function deleteVariant(variantId: string) {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/services/${serviceId}/variants?id=${variantId}`, {
      method: 'DELETE',
    });
    fetchData();
  }

  async function addTemplate() {
    if (!workspaceId || !templateName.trim()) return;
    await fetch(`/api/workspaces/${workspaceId}/services/${serviceId}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName.trim(),
        deadlineDays: templateDeadline ? parseInt(templateDeadline, 10) : null,
        visibleToClient: templateVisible,
      }),
    });
    setTemplateName('');
    setTemplateDeadline('');
    setTemplateVisible(false);
    setShowAddTemplate(false);
    fetchData();
  }

  async function deleteTemplate(templateId: string) {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/services/${serviceId}/templates?id=${templateId}`, {
      method: 'DELETE',
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Service not found.</p>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'details', label: 'Details' },
    { key: 'variants', label: `Variants (${variants.length})` },
    { key: 'templates', label: `Task Templates (${templates.length})` },
  ];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <button
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        onClick={() => router.push(`/app/${slug}/services`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Services
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{service.name}</h1>

      {message && (
        <p className="mt-3 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
            key={t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {tab === 'details' && (
        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setName(e.target.value)}
              value={name}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              value={description}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Price</label>
              <input className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" min="0" onChange={(e) => setPrice(e.target.value)} step="0.01" type="number" value={price} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setCurrency(e.target.value)} value={currency}>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pricing Type</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setPricingType(e.target.value)} value={pricingType}>
                <option value="ONE_TIME">One-time</option>
                <option value="RECURRING">Recurring</option>
              </select>
            </div>
            {pricingType === 'RECURRING' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Interval</label>
                <select className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setRecurringInterval(e.target.value)} value={recurringInterval}>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            )}
          </div>
          {pricingType === 'RECURRING' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">On Renewal</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setRecurringBehavior(e.target.value)} value={recurringBehavior}>
                <option value="NO_ACTION">No action</option>
                <option value="REOPEN">Reopen existing order</option>
                <option value="NEW_ORDER">Create new order</option>
                <option value="SERVICE_REQUESTS">Service requests</option>
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Setup Fee</label>
              <input className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" min="0" onChange={(e) => setSetupFee(e.target.value)} placeholder="0.00" step="0.01" type="number" value={setupFee} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deadline (days)</label>
              <input className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" min="1" onChange={(e) => setDeadline(e.target.value)} type="number" value={deadline} />
            </div>
          </div>
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setCategoryId(e.target.value)} value={categoryId}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Published</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Visible to clients.</p>
            </div>
            <button
              className={`relative h-6 w-11 rounded-full transition-colors ${published ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
              onClick={() => setPublished(!published)}
              type="button"
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${published ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={saving}
            onClick={saveDetails}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {/* Variants Tab */}
      {tab === 'variants' && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pricing variants let clients choose between options.
            </p>
            <button
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => setShowAddVariant(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Variant
            </button>
          </div>

          {showAddVariant && (
            <div className="mt-3 flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input autoFocus className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setVariantName(e.target.value)} placeholder="e.g. Basic" value={variantName} />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Price</label>
                <input className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" min="0" onChange={(e) => setVariantPrice(e.target.value)} step="0.01" type="number" value={variantPrice} />
              </div>
              <button className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700" onClick={addVariant}>Add</button>
              <button className="rounded px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400" onClick={() => setShowAddVariant(false)}>Cancel</button>
            </div>
          )}

          {variants.length === 0 ? (
            <p className="mt-6 text-center text-sm text-gray-400 dark:text-gray-500">No variants yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Price</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
                  {variants.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{v.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">${v.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400" onClick={() => deleteVariant(v.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Task Templates Tab */}
      {tab === 'templates' && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tasks auto-created when a client orders this service.
            </p>
            <button
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => setShowAddTemplate(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Template
            </button>
          </div>

          {showAddTemplate && (
            <div className="mt-3 flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Task Name</label>
                <input autoFocus className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Design mockups" value={templateName} />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Days</label>
                <input className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" min="1" onChange={(e) => setTemplateDeadline(e.target.value)} placeholder="—" type="number" value={templateDeadline} />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                <input checked={templateVisible} className="rounded" onChange={(e) => setTemplateVisible(e.target.checked)} type="checkbox" />
                Client visible
              </label>
              <button className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700" onClick={addTemplate}>Add</button>
              <button className="rounded px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400" onClick={() => setShowAddTemplate(false)}>Cancel</button>
            </div>
          )}

          {templates.length === 0 ? (
            <p className="mt-6 text-center text-sm text-gray-400 dark:text-gray-500">No task templates yet.</p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">#</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Task</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Deadline</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Visible</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
                  {templates.map((t, i) => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.name}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.deadlineDays ? `${t.deadlineDays}d` : '—'}</td>
                      <td className="px-4 py-3">
                        {t.visibleToClient ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">Yes</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-500">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
