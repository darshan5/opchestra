'use client';

import { format } from 'date-fns';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  members: Array<{
    id: string;
    role: string;
    createdAt: string;
    user: { id: string; name: string | null; email: string };
  }>;
  _count: { projects: number; tasks: number };
}

export default function WorkspaceDetailPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`/api/admin/workspaces/${params.workspaceId}`)
      .then(async (res) => {
        if (res.ok) {
          setWorkspace(await res.json());
        }
      })
      .finally(() => setLoading(false));
  }, [params.workspaceId]);

  async function handleDelete() {
    if (!workspace) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/deprovision', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push('/admin/users');
      } else {
        setMessage(`Error: ${data.error}`);
        setConfirmDelete(false);
      }
    } catch {
      setMessage('Error: Something went wrong');
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            href="/admin"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{workspace.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">/{workspace.slug}</p>
          </div>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          onClick={() => setConfirmDelete(true)}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
          Delete Workspace
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {message}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Members</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {workspace.members.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Projects</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {workspace._count.projects}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tasks</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {workspace._count.tasks}
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900 dark:text-white">Members</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Role
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Joined
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {workspace.members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                  {m.user.name ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {m.user.email}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {m.role}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(m.createdAt), 'MMM d, yyyy')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        Created {format(new Date(workspace.createdAt), 'MMMM d, yyyy')}
      </p>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Workspace
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Delete workspace <strong>{workspace.name}</strong> and all its data (
              {workspace._count.tasks} tasks, {workspace._count.projects} projects,{' '}
              {workspace.members.length} members)? Users with no other workspace will also be
              deleted.{' '}
              <span className="font-medium text-red-600 dark:text-red-400">
                This cannot be undone.
              </span>
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                onClick={() => setConfirmDelete(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
                onClick={handleDelete}
                type="button"
              >
                {deleting ? 'Deleting...' : 'Delete Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
