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
  { params }: { params: Promise<{ workspaceId: string; subscriptionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, subscriptionId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, workspaceId },
    include: {
      service: { select: { id: true, name: true, price: true, recurringInterval: true } },
      client: { select: { id: true, name: true, email: true } },
      orders: {
        select: { id: true, status: true, totalPrice: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  if (membership.role === 'CLIENT' && subscription.clientId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(subscription);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; subscriptionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, subscriptionId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, workspaceId },
  });

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (isManager(membership.role)) {
    if ('status' in body) data.status = body.status;
    if ('cancelAtPeriodEnd' in body) data.cancelAtPeriodEnd = body.cancelAtPeriodEnd;
    if ('currentPeriodEnd' in body) data.currentPeriodEnd = new Date(body.currentPeriodEnd);
  } else if (membership.role === 'CLIENT') {
    if (subscription.clientId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if ('cancelAtPeriodEnd' in body) {
      data.cancelAtPeriodEnd = body.cancelAtPeriodEnd === true;
      if (data.cancelAtPeriodEnd) {
        data.status = 'PENDING_CANCEL';
      }
    }
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(subscription);
  }

  const updated = await prisma.subscription.update({
    where: { id: subscriptionId },
    data,
    include: {
      service: { select: { id: true, name: true, price: true, recurringInterval: true } },
      client: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; subscriptionId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, subscriptionId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership || !isManager(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, workspaceId },
  });

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status: 'CANCELED' },
  });

  return NextResponse.json({ ok: true });
}
