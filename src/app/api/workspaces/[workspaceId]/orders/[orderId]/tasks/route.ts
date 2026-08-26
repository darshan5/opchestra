import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, orderId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isClient = membership.role === 'CLIENT';

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      workspaceId,
      ...(isClient ? { clientId: session.user.id } : {}),
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const tasks = await prisma.task.findMany({
    where: { orderId },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      completedAt: true,
      endDate: true,
      position: true,
      assignee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(tasks);
}
