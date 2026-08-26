import { notFound, redirect } from 'next/navigation';

import { PortalSidebar } from '@/components/portal/portal-sidebar';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PortalLayout({
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
      portalSettings: true,
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

  if (membership.role !== 'CLIENT') {
    redirect(`/app/${slug}`);
  }

  const portal = workspace.portalSettings;

  return (
    <div className="flex h-full">
      <PortalSidebar
        logoUrl={portal?.logoUrl}
        primaryColor={portal?.primaryColor ?? '#6366f1'}
        slug={slug}
        userName={session.user.name}
        workspaceName={workspace.name}
      />
      <div className="flex flex-1 flex-col lg:pl-64">
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
