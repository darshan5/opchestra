import { format, subMonths } from 'date-fns';
import Link from 'next/link';

import { MetricCard } from '@/components/admin/MetricCard';
import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { requireAdmin } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

async function getSignupsByMonth(months: number) {
  const data: Array<{ month: string; count: number }> = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const start = subMonths(now, i);
    const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    const count = await prisma.user.count({
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
    });

    data.push({
      count,
      month: format(monthStart, 'yyyy-MM'),
    });
  }

  return data;
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalWorkspaces,
    totalUsers,
    totalTasks,
    activeProjects,
    signupsThisMonth,
    signupsLastMonth,
    activeWorkspaces,
    recentSignups,
    growthData,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.user.count(),
    prisma.task.count(),
    prisma.project.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.user.count({
      where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
    }),
    prisma.workspace.count({
      where: { tasks: { some: { updatedAt: { gte: thirtyDaysAgo } } } },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            workspace: { select: { id: true, name: true } },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    getSignupsByMonth(12),
  ]);

  const signupChange =
    signupsLastMonth > 0
      ? Math.round(((signupsThisMonth - signupsLastMonth) / signupsLastMonth) * 100)
      : signupsThisMonth > 0
        ? 100
        : 0;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total Workspaces" value={totalWorkspaces} />
        <MetricCard title="Total Users" value={totalUsers} />
        <MetricCard
          subtitle={`${activeWorkspaces} active in last 30 days`}
          title="Active Workspaces"
          value={activeWorkspaces}
        />
        <MetricCard
          change={signupChange}
          title="Signups This Month"
          value={signupsThisMonth}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Total Tasks" value={totalTasks} />
        <MetricCard title="Active Projects" value={activeProjects} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UserGrowthChart data={growthData} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Recent Signups
          </h2>
          <div className="space-y-3">
            {recentSignups.map((user) => (
              <div className="flex items-center justify-between text-sm" key={user.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900 dark:text-white">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.memberships[0]?.workspace.name ?? 'No workspace'}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  {user.memberships[0] && (
                    <Link
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      href={`/admin/workspaces/${user.memberships[0].workspace.id}`}
                    >
                      View
                    </Link>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {format(user.createdAt, 'M/d/yyyy')}
                  </p>
                </div>
              </div>
            ))}
            {recentSignups.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent signups.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
