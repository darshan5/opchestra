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
    include: {
      service: { select: { id: true, name: true, price: true, deadline: true } },
      client: { select: { id: true, name: true, email: true } },
      messages: {
        where: isClient ? { teamOnly: false } : {},
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
      tasks: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          status: true,
          assigneeId: true,
          completedAt: true,
          position: true,
          assignee: { select: { id: true, name: true } },
        },
      },
      formSubmissions: {
        include: { form: { select: { id: true, name: true, type: true } } },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, orderId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership || !isManager(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, workspaceId },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId || null;
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  if (body.status !== undefined) {
    data.status = body.status;

    if (body.status === 'WORKING' && !order.startedAt) {
      data.startedAt = new Date();
    }

    if (body.status === 'COMPLETE' && !order.completedAt) {
      data.completedAt = new Date();
    }

    if (body.status !== 'COMPLETE' && body.status !== 'CANCELED' && order.completedAt) {
      data.completedAt = null;
    }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
    include: {
      service: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, orderId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership || !isManager(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, workspaceId },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  await prisma.order.delete({ where: { id: orderId } });

  return NextResponse.json({ ok: true });
}
