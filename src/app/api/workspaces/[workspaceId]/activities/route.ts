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

  const sp = req.nextUrl.searchParams;
  const contactId = sp.get('contactId');
  const companyId = sp.get('companyId');
  const completedParam = sp.get('completed');
  const assigneeId = sp.get('assigneeId');

  const where: Record<string, unknown> = { workspaceId };
  if (contactId) where.contactId = contactId;
  if (companyId) where.companyId = companyId;
  if (completedParam !== null) where.completed = completedParam === 'true';
  if (assigneeId) where.assigneeId = assigneeId;

  const activities = await prisma.activity.findMany({
    where,
    include: {
      contact: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: [
      { dueDate: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
    take: 100,
  });

  return NextResponse.json(activities);
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

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const validTypes = ['CALL', 'NOTE', 'EMAIL', 'MEETING', 'FOLLOW_UP', 'CUSTOM'];
  const type = validTypes.includes(body.type) ? body.type : 'NOTE';

  const activity = await prisma.activity.create({
    data: {
      workspaceId,
      type,
      title: body.title,
      notes: body.notes ?? null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assigneeId: body.assigneeId ?? null,
      contactId: body.contactId ?? null,
      companyId: body.companyId ?? null,
    },
    include: {
      contact: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(activity, { status: 201 });
}
