'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WorkflowStatus {
  name: string;
  color: string;
  category: string;
}

interface WorkflowData {
  id: string;
  name: string;
  statuses: WorkflowStatus[];
  isDefault: boolean;
}

export default function WorkflowsPage() {
  const params = useParams<{ slug: string }>();
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStatuses, setNewStatuses] = useState<WorkflowStatus[]>([
    { name: '', color: '#6B7280', category: 'todo' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((ws) => {
        const w = ws.find((x: { slug: string }) => x.slug === params.slug);
        if (w) {
          setWorkspaceId(w.id);
        }
      });
  }, [params.slug]);

  const loadWorkflows = useCallback(async () => {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/workflows`);
    if (res.ok) {
      setWorkflows(await res.json());
    }
  }, [workspaceId]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  async function createWorkflow() {
    if (!newName.trim() || newStatuses.some((s) => !s.name.trim())) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/workflows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, statuses: newStatuses }),
    });
    if (res.ok) {
      setNewName('');
      setNewStatuses([{ name: '', color: '#6B7280', category: 'todo' }]);
      setShowCreate(false);
      loadWorkflows();
    }
    setSaving(false);
  }

  async function deleteWorkflow(id: string) {
    if (!confirm('Delete this workflow?')) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/workflows/${id}`, { method: 'DELETE' });
    loadWorkflows();
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Status Workflows</h1>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Workflow
        </Button>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Define custom status sets for projects and tickets.
      </p>

      {showCreate && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <Input
            id="wfName"
            label="Workflow name"
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Bug Workflow"
            value={newName}
          />
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Statuses
            </label>
            {newStatuses.map((s, i) => (
              <div className="mt-1 flex items-center gap-2" key={i}>
                <input
                  className="h-8 w-8 cursor-pointer rounded border-0"
                  onChange={(e) => {
                    const updated = [...newStatuses];
                    updated[i].color = e.target.value;
                    setNewStatuses(updated);
                  }}
                  type="color"
                  value={s.color}
                />
                <input
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => {
                    const updated = [...newStatuses];
                    updated[i].name = e.target.value;
                    setNewStatuses(updated);
                  }}
                  placeholder="Status name"
                  value={s.name}
                />
                <select
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => {
                    const updated = [...newStatuses];
                    updated[i].category = e.target.value;
                    setNewStatuses(updated);
                  }}
                  value={s.category}
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="closed">Closed</option>
                </select>
                {newStatuses.length > 1 && (
                  <button
                    className="text-red-400 hover:text-red-600"
                    onClick={() => setNewStatuses(newStatuses.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              className="mt-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
              onClick={() =>
                setNewStatuses([...newStatuses, { name: '', color: '#6B7280', category: 'todo' }])
              }
            >
              + Add status
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={saving} onClick={createWorkflow} size="sm">
              Create
            </Button>
            <Button onClick={() => setShowCreate(false)} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {workflows.map((wf) => (
          <div
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            key={wf.id}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {wf.name}
                  {wf.isDefault && (
                    <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Default
                    </span>
                  )}
                </h3>
              </div>
              {!wf.isDefault && (
                <button
                  className="text-red-400 hover:text-red-600"
                  onClick={() => deleteWorkflow(wf.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(wf.statuses as WorkflowStatus[]).map((s, i) => (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  key={i}
                  style={{ backgroundColor: s.color }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        ))}
        {workflows.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            No workflows yet. The default workflow will be created with your first project.
          </p>
        )}
      </div>
    </div>
  );
}
