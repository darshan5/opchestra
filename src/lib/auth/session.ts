import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { auth } from '.';

export async function getRequiredSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  return session as { user: { id: string; email: string; name?: string | null } };
}

export async function getWorkspaceMembership(workspaceId: string) {
  const session = await getRequiredSession();

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: session.user.id,
      },
    },
    include: {
      workspace: true,
    },
  });

  if (!membership) {
    redirect('/app');
  }

  return { session, membership };
}

export function hasRole(
  userRole: string,
  requiredRole: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'MEMBER',
): boolean {
  const hierarchy = ['MEMBER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(requiredRole);
}
