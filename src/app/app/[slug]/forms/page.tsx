'use client';

import { formatDistanceToNow } from 'date-fns';
import { FileText, Plus, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type FilterType = 'ALL' | 'ORDER' | 'INTAKE' | 'ONBOARDING' | 'CONTACT';

interface FormItem {
  id: string;
  name: string;
  type: string;
  fields: unknown[];
  published: boolean;
  createdAt: string;
}

export default function FormsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('ORDER');
  const [creating, setCreating] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/forms`);
      if (res.ok) setForms(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !newName.trim()) return;
    setCreating(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/forms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), type: newType }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/app/${slug}/forms/${data.id}`);
    }
    setCreating(false);
  }

  const filtered = filter === 'ALL' ? forms : forms.filter((f) => f.type === filter);

  const typeBadge: Record<string, string> = {
    ORDER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    INTAKE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    ONBOARDING: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    CONTACT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  };

  const filterTabs: Array<{ key: FilterType; label: string }> = [
    { key: 'ALL', label: 'All' },
    { key: 'ORDER', label: 'Order' },
    { key: 'INTAKE', label: 'Intake' },
    { key: 'ONBOARDING', label: 'Onboarding' },
    { key: 'CONTACT', label: 'Contact' },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forms</h1>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
          New Form
        </button>
      </div>

      {showCreate && (
        <form
          className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          onSubmit={handleCreate}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New Form</h2>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setShowCreate(false)} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              autoFocus
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Form name"
              required
              value={newName}
            />
            <select
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setNewType(e.target.value)}
              value={newType}
            >
              <option value="ORDER">Order</option>
              <option value="INTAKE">Intake</option>
              <option value="ONBOARDING">Onboarding</option>
              <option value="CONTACT">Contact</option>
            </select>
          </div>
          <button
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={creating}
            type="submit"
          >
            {creating ? 'Creating...' : 'Create Form'}
          </button>
        </form>
      )}

      <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {filterTabs.map((t) => (
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              filter === t.key
                ? 'border-b-2 border-blue-600 text-blue-700 dark:text-blue-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
            key={t.key}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No forms yet.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Fields</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {filtered.map((form) => (
                <tr
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
                  key={form.id}
                  onClick={() => router.push(`/app/${slug}/forms/${form.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{form.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadge[form.type] ?? ''}`}>
                      {form.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {Array.isArray(form.fields) ? form.fields.length : 0}
                  </td>
                  <td className="px-4 py-3">
                    {form.published ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">Published</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-500">Draft</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(form.createdAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
