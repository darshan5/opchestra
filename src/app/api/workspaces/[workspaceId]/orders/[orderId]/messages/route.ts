import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

function isManager(role: string) {
  return ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);
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

  const messages = await prisma.orderMessage.findMany({
    where: {
      orderId,
      ...(isClient ? { teamOnly: false } : {}),
    },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
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

  const body = await req.json();

  if (!body.content || typeof body.content !== 'string') {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const teamOnly = isClient ? false : (body.teamOnly ?? false);

  const message = await prisma.orderMessage.create({
    data: {
      orderId,
      authorId: session.user.id,
      content: body.content,
      teamOnly,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
