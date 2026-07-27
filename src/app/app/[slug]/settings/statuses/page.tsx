'use client';

import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

interface StatusItem {
  name: string;
  color: string;
  category: 'todo' | 'in_progress' | 'done';
}

export default function StatusSettingsPage() {
  const params = useParams<{ slug: string }>();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetchWorkflow(ws.id);
        }
        setLoading(false);
      });
  }, [params.slug]);

  async function fetchWorkflow(wid: string) {
    const res = await fetch(`/api/workspaces/${wid}/workflows/default`);
    if (res.ok) {
      const data = await res.json();
      setStatuses(data.statuses || []);
    }
  }

  function addStatus() {
    setStatuses([...statuses, { name: '', color: '#6B7280', category: 'todo' }]);
  }

  function updateStatus(index: number, field: keyof StatusItem, value: string) {
    const updated = [...statuses];
    updated[index] = { ...updated[index], [field]: value };
    setStatuses(updated);
  }

  function removeStatus(index: number) {
    setStatuses(statuses.filter((_, i) => i !== index));
  }

  function moveStatus(from: number, to: number) {
    if (to < 0 || to >= statuses.length) {
      return;
    }
    const updated = [...statuses];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setStatuses(updated);
  }

  async function save() {
    if (!workspaceId) {
      return;
    }
    const valid = statuses.filter((s) => s.name.trim());
    if (valid.length === 0) {
      setMessage('At least one status is required');
      return;
    }
    setSaving(true);
    setMessage('');

    const res = await fetch(`/api/workspaces/${workspaceId}/workflows/default`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statuses: valid }),
    });

    if (res.ok) {
      setMessage('Statuses saved');
      setStatuses(valid);
    } else {
      setMessage('Failed to save');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Status Configuration</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Define statuses, set their colors and order. These are used in table views and kanban boards.
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-3 px-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
          <div className="w-6" />
          <div className="w-8">Color</div>
          <div className="flex-1">Name</div>
          <div className="w-36">Category</div>
          <div className="w-8" />
        </div>

        {statuses.map((status, i) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-2 py-2 dark:border-gray-700 dark:bg-gray-900"
            key={i}
          >
            <div className="flex flex-col gap-0.5">
              <button
                className="text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300"
                disabled={i === 0}
                onClick={() => moveStatus(i, i - 1)}
                type="button"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </div>

            <input
              className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
              onChange={(e) => updateStatus(i, 'color', e.target.value)}
              type="color"
              value={status.color}
            />

            <input
              className="flex-1 rounded border border-gray-200 bg-transparent px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:text-white"
              onChange={(e) => updateStatus(i, 'name', e.target.value)}
              placeholder="Status name..."
              type="text"
              value={status.name}
            />

            <select
              className="w-36 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              onChange={(e) =>
                updateStatus(i, 'category', e.target.value as StatusItem['category'])
              }
              value={status.category}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>

            <button
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
              onClick={() => removeStatus(i)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
          onClick={addStatus}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add Status
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button loading={saving} onClick={save}>
          Save Statuses
        </Button>
        <span className="text-xs text-gray-400">
          {statuses.length} statuses configured
        </span>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preview</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {statuses
            .filter((s) => s.name.trim())
            .map((s, i) => (
              <span
                className="rounded-full px-3 py-1 text-xs font-medium text-white"
                key={i}
                style={{ backgroundColor: s.color }}
              >
                {s.name}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
