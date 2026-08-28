import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getAdminMembership(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
    return null;
  }
  return membership;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; webhookId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, webhookId } = await params;
  const membership = await getAdminMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, workspaceId },
    include: {
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!endpoint) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json(endpoint);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; webhookId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, webhookId } = await params;
  const membership = await getAdminMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ('url' in body) data.url = body.url;
  if ('events' in body) data.events = body.events;
  if ('active' in body) data.active = body.active;

  const endpoint = await prisma.webhookEndpoint.updateMany({
    where: { id: webhookId, workspaceId },
    data,
  });

  if (endpoint.count === 0) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; webhookId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, webhookId } = await params;
  const membership = await getAdminMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await prisma.webhookEndpoint.deleteMany({
    where: { id: webhookId, workspaceId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
