import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

import { requireAdmin } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [workspaces, userCount, taskCount] = await Promise.all([
    prisma.workspace.findMany({
      include: {
        _count: { select: { members: true, projects: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
    prisma.task.count(),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{userCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Workspaces</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {workspaces.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{taskCount}</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-gray-900 dark:text-white">Workspaces</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Slug
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Members
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Projects
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Tasks
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {workspaces.map((ws) => (
              <tr className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900" key={ws.id}>
                <td className="px-4 py-2.5">
                  <Link
                    className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                    href={`/admin/workspaces/${ws.id}`}
                  >
                    {ws.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{ws.slug}</td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {ws._count.members}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {ws._count.projects}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {ws._count.tasks}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(ws.createdAt, { addSuffix: true })}
                </td>
              </tr>
            ))}
            {workspaces.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={6}>
                  No workspaces yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
