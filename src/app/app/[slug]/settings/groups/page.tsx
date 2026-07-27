'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

interface GroupItem {
  id: string;
  name: string;
  color: string;
}

export default function GroupSettingsPage() {
  const params = useParams<{ slug: string }>();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetchGroups(ws.id);
        }
        setLoading(false);
      });
  }, [params.slug]);

  async function fetchGroups(wid: string) {
    const res = await fetch(`/api/workspaces/${wid}/groups`);
    if (res.ok) {
      setGroups(await res.json());
    }
  }

  async function addGroup() {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Group', color: '#6366F1' }),
    });
    if (res.ok) {
      fetchGroups(workspaceId);
    }
  }

  async function updateGroup(id: string, data: Partial<GroupItem>) {
    if (!workspaceId) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async function deleteGroup(id: string, name: string) {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/groups/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setDeleteConfirmId(null);
      setMessage(`Group "${name}" deleted`);
    }
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Task Groups</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage cross-project task groups. Tasks from any project can be assigned to a group.
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <div className="mt-6 space-y-2">
        {groups.map((g) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            key={g.id}
          >
            <input
              className="h-8 w-8 cursor-pointer rounded border-0"
              onChange={(e) => {
                setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, color: e.target.value } : x)));
                updateGroup(g.id, { color: e.target.value });
              }}
              type="color"
              value={g.color}
            />
            <input
              className="flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              defaultValue={g.name}
              onBlur={(e) => updateGroup(g.id, { name: e.target.value })}
              type="text"
            />
            {deleteConfirmId === g.id ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
                <button className="text-xs font-medium text-red-600" onClick={() => deleteGroup(g.id, g.name)} type="button">Yes</button>
                <button className="text-xs text-gray-500" onClick={() => setDeleteConfirmId(null)} type="button">No</button>
              </div>
            ) : (
              <button
                className="text-gray-400 hover:text-red-500"
                onClick={() => setDeleteConfirmId(g.id)}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {groups.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            No groups yet
          </p>
        )}
      </div>

      <Button className="mt-4" onClick={addGroup} variant="secondary">
        <Plus className="mr-1 h-4 w-4" /> Add Group
      </Button>
    </div>
  );
}
