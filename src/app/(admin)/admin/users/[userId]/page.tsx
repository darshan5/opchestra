'use client';

import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  emailVerified: string | null;
  createdAt: string;
  memberships: Array<{
    id: string;
    role: string;
    workspace: { id: string; name: string; slug: string };
  }>;
  createdTasks: Array<{ id: string; title: string; status: string; createdAt: string }>;
  _count: { assignedTasks: number; createdTasks: number; comments: number };
}

export default function UserDetailPage() {
  const params = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/admin/users/${params.userId}`)
      .then((r) => r.json())
      .then((u) => {
        setUser(u);
        setLoading(false);
      });
  }, [params.userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">User not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <Link
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          href="/admin/users"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user.name ?? 'Unnamed User'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Workspaces</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {user.memberships.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Tasks Created</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {user._count.createdTasks}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Assigned</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {user._count.assignedTasks}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Comments</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {user._count.comments}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Account Info</h3>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500 dark:text-gray-400">Email verified:</dt>
            <dd className="text-gray-900 dark:text-white">
              {user.emailVerified ? format(new Date(user.emailVerified), 'MMM d, yyyy') : 'No'}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 dark:text-gray-400">Joined:</dt>
            <dd className="text-gray-900 dark:text-white">
              {format(new Date(user.createdAt), 'MMMM d, yyyy')}
            </dd>
          </div>
        </dl>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900 dark:text-white">
        Workspace Memberships
      </h2>
      <div className="mt-3 space-y-2">
        {user.memberships.map((m) => (
          <div
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            key={m.id}
          >
            <div>
              <Link
                className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                href={`/admin/workspaces/${m.workspace.id}`}
              >
                {m.workspace.name}
              </Link>
              <p className="text-xs text-gray-500 dark:text-gray-400">/{m.workspace.slug}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {m.role}
            </span>
          </div>
        ))}
        {user.memberships.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No workspace memberships</p>
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900 dark:text-white">Recent Tasks</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Title
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {user.createdTasks.map((task) => (
              <tr key={task.id}>
                <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-white">{task.title}</td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {task.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(task.createdAt), 'M/d/yyyy')}
                </td>
              </tr>
            ))}
            {user.createdTasks.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={3}>
                  No tasks
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
