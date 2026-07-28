import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function WorkspaceHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({ where: { slug } });
  if (!workspace) {
    redirect('/app');
  }

  const [myTasks, taskCounts, recentActivity, projects] = await Promise.all([
    prisma.task.findMany({
      where: { workspaceId: workspace.id, assigneeId: session.user.id, completedAt: null },
      orderBy: { endDate: 'asc' },
      take: 10,
      select: { id: true, title: true, endDate: true, priority: true, project: { select: { name: true } } },
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { workspaceId: workspace.id, assigneeId: session.user.id, completedAt: null },
      _count: true,
    }),
    prisma.comment.findMany({
      where: { task: { workspaceId: workspace.id } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true, email: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    prisma.project.findMany({
      where: { workspaceId: workspace.id, status: 'ACTIVE' },
      include: { _count: { select: { tasks: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
  ]);

  const priorityBadge: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const overdue = myTasks.filter((t) => t.endDate && t.endDate < todayStart);
  const dueToday = myTasks.filter(
    (t) => t.endDate && t.endDate >= todayStart && t.endDate < todayEnd,
  );
  const dueThisWeek = myTasks.filter(
    (t) => t.endDate && t.endDate >= todayEnd && t.endDate < weekEnd,
  );

  const todoCount = taskCounts.find((g) => g.status === 'Todo')?._count ?? 0;
  const inProgressCount = taskCounts.find((g) => g.status === 'In Progress')?._count ?? 0;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Home</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Welcome back, {session.user.name ?? 'there'}
      </p>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Todo</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{todoCount}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <p className="text-sm text-blue-600 dark:text-blue-400">In Progress</p>
          <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {inProgressCount}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-600 dark:text-red-400">Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{overdue.length}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
          <p className="text-sm text-orange-600 dark:text-orange-400">Due Today</p>
          <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
            {dueToday.length}
          </p>
        </div>
      </div>

      {/* Activity & Upcoming */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Activity Feed */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentActivity.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                No recent activity
              </p>
            ) : (
              recentActivity.map((c) => {
                const isSystem =
                  typeof c.content === 'object' &&
                  c.content !== null &&
                  'type' in c.content &&
                  (c.content as Record<string, unknown>).type === 'system';
                const text =
                  typeof c.content === 'object' && c.content !== null && 'text' in c.content
                    ? String((c.content as Record<string, unknown>).text)
                    : '';
                return (
                  <div className="flex gap-3 px-4 py-2.5" key={c.id}>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {c.user.name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {c.user.name ?? c.user.email}
                        </span>{' '}
                        {isSystem ? text : 'commented on'}{' '}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {c.task.title}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upcoming */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Upcoming</h2>
          </div>
          <div className="px-4 py-3">
            {overdue.length === 0 && dueToday.length === 0 && dueThisWeek.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                No upcoming deadlines
              </p>
            ) : (
              <div className="space-y-4">
                {overdue.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400">OVERDUE</p>
                    {overdue.map((t) => (
                      <Link
                        className="mt-1 flex items-center gap-2 rounded py-1 px-1 hover:bg-red-50 dark:hover:bg-red-950/20"
                        href={`/app/${slug}/all-tasks?task=${t.id}`}
                        key={t.id}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white">
                          {t.title}
                        </span>
                        {t.priority && t.priority !== 'NONE' && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${priorityBadge[t.priority] ?? ''}`}>
                            {t.priority.charAt(0) + t.priority.slice(1).toLowerCase()}
                          </span>
                        )}
                        <span className="shrink-0 text-xs text-red-500">
                          {t.endDate && formatDistanceToNow(t.endDate, { addSuffix: true })}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                {dueToday.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      TODAY
                    </p>
                    {dueToday.map((t) => (
                      <Link
                        className="mt-1 flex items-center gap-2 rounded py-1 px-1 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                        href={`/app/${slug}/all-tasks?task=${t.id}`}
                        key={t.id}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white">
                          {t.title}
                        </span>
                        {t.priority && t.priority !== 'NONE' && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${priorityBadge[t.priority] ?? ''}`}>
                            {t.priority.charAt(0) + t.priority.slice(1).toLowerCase()}
                          </span>
                        )}
                        <span className="shrink-0 text-xs text-gray-500">
                          {t.project?.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
                {dueThisWeek.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                      THIS WEEK
                    </p>
                    {dueThisWeek.map((t) => (
                      <Link
                        className="mt-1 flex items-center gap-2 rounded py-1 px-1 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                        href={`/app/${slug}/all-tasks?task=${t.id}`}
                        key={t.id}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-900 dark:text-white">
                          {t.title}
                        </span>
                        {t.priority && t.priority !== 'NONE' && (
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${priorityBadge[t.priority] ?? ''}`}>
                            {t.priority.charAt(0) + t.priority.slice(1).toLowerCase()}
                          </span>
                        )}
                        <span className="shrink-0 text-xs text-gray-500">
                          {t.endDate && formatDistanceToNow(t.endDate, { addSuffix: true })}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      {projects.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
            <Link
              className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
              href={`/app/${slug}/projects/new`}
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700"
                href={`/app/${slug}/projects/${p.id}`}
                key={p.id}
              >
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {p._count.tasks} tasks
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
