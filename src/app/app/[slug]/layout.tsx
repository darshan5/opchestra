import { notFound, redirect } from 'next/navigation';

import { Sidebar } from '@/components/layout/sidebar';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      projects: {
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          phases: {
            select: { id: true, name: true, color: true },
            orderBy: { position: 'asc' },
          },
        },
      },
      taskGroups: {
        select: { id: true, name: true, color: true },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!workspace) {
    notFound();
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    redirect('/app');
  }

  const views = await prisma.view.findMany({
    where: {
      workspaceId: workspace.id,
      isShared: true,
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="flex h-full">
      <Sidebar
        projects={workspace.projects}
        slug={slug}
        taskGroups={workspace.taskGroups}
        userName={session.user.name}
        views={views}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
      <div className="flex flex-1 flex-col lg:pl-64">
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
