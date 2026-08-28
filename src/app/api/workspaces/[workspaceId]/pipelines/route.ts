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

const DEFAULT_STAGES: Record<string, Array<{ name: string; color: string }>> = {
  SALES: [
    { name: 'New Lead', color: '#6366f1' },
    { name: 'Qualified', color: '#8b5cf6' },
    { name: 'Proposal', color: '#3b82f6' },
    { name: 'Negotiation', color: '#f59e0b' },
    { name: 'Won', color: '#22c55e' },
    { name: 'Lost', color: '#ef4444' },
  ],
  PRODUCTION: [
    { name: 'Backlog', color: '#6b7280' },
    { name: 'In Progress', color: '#3b82f6' },
    { name: 'Review', color: '#f59e0b' },
    { name: 'Delivered', color: '#22c55e' },
  ],
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const typeFilter = req.nextUrl.searchParams.get('type');

  const pipelines = await prisma.pipeline.findMany({
    where: {
      workspaceId,
      ...(typeFilter ? { type: typeFilter as 'SALES' | 'PRODUCTION' } : {}),
    },
    include: {
      stages: {
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { contacts: true, companies: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(pipelines);
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
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const type = body.type === 'PRODUCTION' ? 'PRODUCTION' : 'SALES';

  const pipeline = await prisma.pipeline.create({
    data: {
      workspaceId,
      name: body.name,
      type,
      stages: {
        create: (DEFAULT_STAGES[type] ?? []).map((s, i) => ({
          name: s.name,
          color: s.color,
          position: i,
        })),
      },
    },
    include: {
      stages: {
        orderBy: { position: 'asc' },
        include: {
          _count: { select: { contacts: true, companies: true } },
        },
      },
    },
  });

  return NextResponse.json(pipeline, { status: 201 });
}
