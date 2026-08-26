import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getManagerMembership(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(membership.role)) {
    return null;
  }
  return membership;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; clientId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, clientId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: clientId, role: 'CLIENT' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          isClient: true,
          accountBalance: true,
          createdAt: true,
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: client.id,
    userId: client.user.id,
    email: client.user.email,
    name: client.user.name,
    accountBalance: client.user.accountBalance,
    createdAt: client.createdAt,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; clientId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, clientId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: clientId, role: 'CLIENT' },
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  await prisma.workspaceMember.delete({ where: { id: client.id } });

  return NextResponse.json({ ok: true });
}
