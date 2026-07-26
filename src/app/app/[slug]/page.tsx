import { formatDistanceToNow } from 'date-fns';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function WorkspaceHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
  });

  if (!workspace) {
    redirect('/app');
  }

  const myTasks = await prisma.task.findMany({
    where: {
      workspaceId: workspace.id,
      assigneeId: session.user.id,
      completedAt: null,
    },
    orderBy: { endDate: 'asc' },
    take: 10,
    include: {
      project: { select: { name: true } },
    },
  });

  const overdue = myTasks.filter((t) => t.endDate && t.endDate < new Date());
  const dueToday = myTasks.filter((t) => {
    if (!t.endDate) {
      return false;
    }
    const today = new Date();
    return (
      t.endDate >= new Date(today.setHours(0, 0, 0, 0)) &&
      t.endDate <= new Date(today.setHours(23, 59, 59, 999))
    );
  });

  const taskCounts = await prisma.task.groupBy({
    by: ['status'],
    where: {
      workspaceId: workspace.id,
      assigneeId: session.user.id,
      completedAt: null,
    },
    _count: true,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Home</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Welcome back, {session.user.name ?? 'there'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Open tasks</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {taskCounts.reduce((sum, g) => sum + g._count, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-600 dark:text-red-400">Overdue</p>
          <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{overdue.length}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950">
          <p className="text-sm text-orange-600 dark:text-orange-400">Due today</p>
          <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
            {dueToday.length}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Tasks</h2>
        {myTasks.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            No tasks assigned to you. Create a project and add some tasks to get started.
          </p>
        ) : (
          <div className="mt-3 space-y-1">
            {myTasks.map((task) => (
              <div
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
                key={task.id}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {task.project?.name ?? 'No project'}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      task.priority === 'URGENT'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : task.priority === 'HIGH'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                          : task.priority === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {task.priority === 'NONE' ? '' : task.priority.toLowerCase()}
                  </span>
                  {task.endDate && (
                    <span
                      className={`text-xs ${
                        task.endDate < new Date()
                          ? 'font-medium text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {formatDistanceToNow(task.endDate, { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
