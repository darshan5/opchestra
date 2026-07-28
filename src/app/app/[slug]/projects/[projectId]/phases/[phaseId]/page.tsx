import { notFound, redirect } from 'next/navigation';

import { ViewSwitcher } from '@/components/views/view-switcher';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PhasePage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string; phaseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { slug, projectId, phaseId } = await params;

  const workspace = await prisma.workspace.findUnique({ where: { slug } });
  if (!workspace) {
    notFound();
  }

  const phase = await prisma.phase.findUnique({ where: { id: phaseId } });
  if (!phase || phase.projectId !== projectId) {
    notFound();
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.workspaceId !== workspace.id) {
    notFound();
  }

  const tasks = await prisma.task.findMany({
    where: { workspaceId: workspace.id, projectId, phaseId, parentTaskId: null },
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
        <p className="text-xs text-gray-500 dark:text-gray-400">{project.name}</p>
        <h1 className="text-xl font-bold dark:text-white" style={{ color: phase.color }}>
          {phase.name}
        </h1>
      </div>
      <ViewSwitcher
        context="project"
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
