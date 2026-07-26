import { redirect } from 'next/navigation';

import { prisma } from '@/lib/db';

import { auth } from '.';

export async function requireSaasAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, isSaasAdmin: true },
  });

  if (!user?.isSaasAdmin) {
    redirect('/app');
  }

  return user;
}

export async function isSaasAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSaasAdmin: true },
  });
  return user?.isSaasAdmin ?? false;
}
