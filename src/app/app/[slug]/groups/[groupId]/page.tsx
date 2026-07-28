import { notFound, redirect } from 'next/navigation';

import { ViewSwitcher } from '@/components/views/view-switcher';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function GroupPage({
  params,
}: {
  params: Promise<{ slug: string; groupId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { slug, groupId } = await params;

  const workspace = await prisma.workspace.findUnique({ where: { slug } });
  if (!workspace) {
    notFound();
  }

  const group = await prisma.taskGroup.findUnique({ where: { id: groupId } });
  if (!group || group.workspaceId !== workspace.id) {
    notFound();
  }

  const tasks = await prisma.task.findMany({
    where: { workspaceId: workspace.id, taskGroupId: groupId, parentTaskId: null, ticketNumber: null },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
      taskLabels: { include: { label: true } },
      taskGroup: { select: { id: true, name: true, color: true } },
      ticketCompany: { select: { id: true, name: true } },
      phase: { select: { id: true, name: true, color: true } },
      _count: { select: { subTasks: true, comments: true } },
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });

  const [members, allProjects] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    prisma.project.findMany({
      where: { workspaceId: workspace.id, status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">Group</p>
        <h1 className="text-xl font-bold dark:text-white" style={{ color: group.color }}>
          {group.name}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tasks from all projects in this group
        </p>
      </div>
      <ViewSwitcher
        context="group"
        members={members.map((m) => m.user)}
        projects={allProjects}
        slug={slug}
        tasks={tasks}
        workspaceId={workspace.id}
      />
    </div>
  );
}
