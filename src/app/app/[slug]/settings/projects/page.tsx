'use client';

import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  _count: { tasks: number };
}

export default function ProjectSettingsPage() {
  const params = useParams<{ slug: string }>();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetchProjects(ws.id);
        }
        setLoading(false);
      });
  }, [params.slug]);

  async function fetchProjects(wid: string) {
    const res = await fetch(`/api/workspaces/${wid}/projects`);
    if (res.ok) {
      setProjects(await res.json());
    }
  }

  async function updateProject(id: string, data: Record<string, unknown>) {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      fetchProjects(workspaceId);
    }
  }

  async function deleteProject(id: string, name: string) {
    if (!workspaceId || !confirm(`Delete project "${name}" and all its tasks? This cannot be undone.`)) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/projects/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setMessage(`Project "${name}" deleted`);
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage projects — edit names, archive, or delete.
      </p>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <div className="mt-6 space-y-2">
        {projects.map((p) => (
          <div
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            key={p.id}
          >
            <div className="min-w-0 flex-1">
              <input
                className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                defaultValue={p.name}
                onBlur={(e) => updateProject(p.id, { name: e.target.value })}
                type="text"
              />
              <input
                className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                defaultValue={p.description ?? ''}
                onBlur={(e) => updateProject(p.id, { description: e.target.value || undefined })}
                placeholder="Description..."
                type="text"
              />
            </div>
            <span className="text-xs text-gray-400">{p._count.tasks} tasks</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                p.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {p.status}
            </span>
            <button
              className="text-gray-400 hover:text-amber-500"
              onClick={() =>
                updateProject(p.id, {
                  status: p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
                })
              }
              title={p.status === 'ACTIVE' ? 'Archive' : 'Unarchive'}
              type="button"
            >
              {p.status === 'ACTIVE' ? (
                <Archive className="h-4 w-4" />
              ) : (
                <ArchiveRestore className="h-4 w-4" />
              )}
            </button>
            <button
              className="text-gray-400 hover:text-red-500"
              onClick={() => deleteProject(p.id, p.name)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {projects.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            No projects yet
          </p>
        )}
      </div>
    </div>
  );
}
