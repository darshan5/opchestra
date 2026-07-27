import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
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

    const rules = await prisma.slaRule.findMany({
      where: { workspaceId },
      orderBy: { priority: 'asc' },
    });
    return NextResponse.json(rules);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership || !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { rules } = await request.json();

    await prisma.$transaction(
      rules.map((r: { priority: string; responseTime: number; resolutionTime: number }) =>
        prisma.slaRule.upsert({
          where: { workspaceId_priority: { workspaceId, priority: r.priority } },
          create: { workspaceId, priority: r.priority, responseTime: r.responseTime, resolutionTime: r.resolutionTime },
          update: { responseTime: r.responseTime, resolutionTime: r.resolutionTime },
        }),
      ),
    );

    const updated = await prisma.slaRule.findMany({ where: { workspaceId } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
