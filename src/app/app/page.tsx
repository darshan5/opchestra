import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function AppPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: 'desc' },
  });

  if (memberships.length === 0) {
    redirect('/app/onboarding');
  }

  const firstMembership = memberships[0];

  if (firstMembership.role === 'CLIENT') {
    redirect(`/portal/${firstMembership.workspace.slug}`);
  }

  redirect(`/app/${firstMembership.workspace.slug}`);
}
