import { redirect } from 'next/navigation';

import { ViewSwitcher } from '@/components/views/view-switcher';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function AllTasksPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ task?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { slug } = await params;
  const { task: openTaskId } = await searchParams;

  const workspace = await prisma.workspace.findUnique({ where: { slug } });
  if (!workspace) {
    redirect('/app');
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });

  if (!membership) {
    redirect('/app');
  }

  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: workspace.id,
      parentTaskId: null,
      ticketNumber: null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
      taskGroup: { select: { id: true, name: true, color: true } },
      taskLabels: { include: { label: true } },
      _count: { select: { subTasks: true, comments: true } },
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });

  const [members, projects, taskGroups] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    prisma.project.findMany({
      where: { workspaceId: workspace.id, status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.taskGroup.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, color: true },
      orderBy: { position: 'asc' },
    }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">All Tasks</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          All tasks across all projects
        </p>
      </div>
      <ViewSwitcher
        currentUserRole={membership.role}
        defaultGroupBy="group"
        initialOpenTaskId={openTaskId}
        members={members.map((m) => m.user)}
        projects={projects}
        slug={slug}
        taskGroups={taskGroups}
        tasks={tasks}
        workspaceId={workspace.id}
      />
    </div>
  );
}
