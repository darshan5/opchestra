'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

interface SlaRow {
  priority: string;
  responseTime: number;
  resolutionTime: number;
}

const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
const DEFAULTS: SlaRow[] = [
  { priority: 'URGENT', responseTime: 30, resolutionTime: 240 },
  { priority: 'HIGH', responseTime: 60, resolutionTime: 480 },
  { priority: 'MEDIUM', responseTime: 240, resolutionTime: 1440 },
  { priority: 'LOW', responseTime: 480, resolutionTime: 2880 },
];

export default function SlaSettingsPage() {
  const params = useParams<{ slug: string }>();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [rules, setRules] = useState<SlaRow[]>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((wss) => {
        const ws = wss.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetch(`/api/workspaces/${ws.id}/sla-rules`)
            .then((r) => r.json())
            .then((data) => {
              if (Array.isArray(data) && data.length > 0) {
                setRules(
                  PRIORITIES.map((p) => {
                    const existing = data.find((r: SlaRow) => r.priority === p);
                    return existing || DEFAULTS.find((d) => d.priority === p)!;
                  }),
                );
              }
            });
        }
      });
  }, [params.slug]);

  function updateRule(priority: string, field: 'responseTime' | 'resolutionTime', value: number) {
    setRules(rules.map((r) => (r.priority === priority ? { ...r, [field]: value } : r)));
  }

  function formatMinutes(mins: number): string {
    if (mins < 60) {
      return `${mins}m`;
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  async function save() {
    if (!workspaceId) {
      return;
    }
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/workspaces/${workspaceId}/sla-rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    });
    setMessage(res.ok ? 'SLA rules saved' : 'Failed to save');
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SLA Rules</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Set response and resolution time targets per priority level.
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Priority
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Response Time (mins)
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Resolution Time (mins)
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Display
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rules.map((r) => (
              <tr key={r.priority}>
                <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                  {r.priority}
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    min={1}
                    onChange={(e) => updateRule(r.priority, 'responseTime', Number(e.target.value))}
                    type="number"
                    value={r.responseTime}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    min={1}
                    onChange={(e) =>
                      updateRule(r.priority, 'resolutionTime', Number(e.target.value))
                    }
                    type="number"
                    value={r.resolutionTime}
                  />
                </td>
                <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  {formatMinutes(r.responseTime)} / {formatMinutes(r.resolutionTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button className="mt-4" loading={saving} onClick={save}>
        Save SLA Rules
      </Button>
    </div>
  );
}
