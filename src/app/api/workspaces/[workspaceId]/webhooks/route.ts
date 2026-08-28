import crypto from 'crypto';

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
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getAdminMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { workspaceId },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      lastCalledAt: true,
      lastStatus: true,
      createdAt: true,
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(endpoints);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getAdminMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { url, events } = await req.json();

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'At least one event is required' }, { status: 400 });
  }

  const secret = crypto.randomBytes(32).toString('hex');

  const endpoint = await prisma.webhookEndpoint.create({
    data: { workspaceId, url, events, secret },
  });

  return NextResponse.json(endpoint, { status: 201 });
}
