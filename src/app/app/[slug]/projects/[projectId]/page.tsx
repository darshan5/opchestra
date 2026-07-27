import { notFound, redirect } from 'next/navigation';

import { ViewSwitcher } from '@/components/views/view-switcher';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { slug, projectId } = await params;

  const workspace = await prisma.workspace.findUnique({ where: { slug } });
  if (!workspace) {
    notFound();
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });

  if (!membership) {
    redirect('/app');
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.workspaceId !== workspace.id) {
    notFound();
  }

  const tasks = await prisma.task.findMany({
    where: { workspaceId: workspace.id, projectId, parentTaskId: null },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      project: { select: { id: true, name: true } },
      taskLabels: { include: { label: true } },
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{project.description}</p>
        )}
      </div>
      <ViewSwitcher
        members={members.map((m) => m.user)}
        projectId={projectId}
        projects={allProjects}
        slug={slug}
        tasks={tasks}
        workspaceId={workspace.id}
      />
    </div>
  );
}
