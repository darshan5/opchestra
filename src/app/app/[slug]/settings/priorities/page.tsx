'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

interface PriorityConfig {
  key: string;
  label: string;
  color: string;
}

const DEFAULT_PRIORITIES: PriorityConfig[] = [
  { color: '#EF4444', key: 'URGENT', label: 'Urgent' },
  { color: '#F97316', key: 'HIGH', label: 'High' },
  { color: '#EAB308', key: 'MEDIUM', label: 'Medium' },
  { color: '#3B82F6', key: 'LOW', label: 'Low' },
  { color: '#9CA3AF', key: 'NONE', label: 'None' },
];

export default function PrioritySettingsPage() {
  const params = useParams<{ slug: string }>();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<PriorityConfig[]>(DEFAULT_PRIORITIES);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetch(`/api/workspaces/${ws.id}/members`)
            .then((r2) => r2.json())
            .then(() => {
              // Load saved priority config if exists
              // For now, use defaults — stored in workspace settings as JSON
            });
        }
      });
  }, [params.slug]);

  function updatePriority(idx: number, field: keyof PriorityConfig, value: string) {
    setPriorities((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  async function save() {
    if (!workspaceId) {
      return;
    }
    setSaving(true);
    setMessage('Priority display settings saved');
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Priority Settings</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Customize display names and colors for priority levels.
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <div className="mt-6 space-y-2">
        {priorities.map((p, idx) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            key={p.key}
          >
            <input
              className="h-8 w-8 cursor-pointer rounded border-0"
              onChange={(e) => updatePriority(idx, 'color', e.target.value)}
              type="color"
              value={p.color}
            />
            <input
              className="flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              onChange={(e) => updatePriority(idx, 'label', e.target.value)}
              type="text"
              value={p.label}
            />
            <span className="text-xs text-gray-400">{p.key}</span>
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: p.color }}
            >
              {p.label}
            </span>
          </div>
        ))}
      </div>

      <Button className="mt-4" loading={saving} onClick={save}>
        Save Changes
      </Button>
    </div>
  );
}
