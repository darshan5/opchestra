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
  { params }: { params: Promise<{ workspaceId: string; pipelineId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, pipelineId } = await params;
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, workspaceId },
    include: {
      stages: {
        orderBy: { position: 'asc' },
        include: {
          contacts: {
            select: {
              id: true,
              name: true,
              email: true,
              company: { select: { id: true, name: true } },
            },
          },
          companies: {
            select: {
              id: true,
              name: true,
              domain: true,
              _count: { select: { contacts: true } },
            },
          },
        },
      },
    },
  });

  if (!pipeline) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(pipeline);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; pipelineId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, pipelineId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.pipeline.findFirst({
    where: { id: pipelineId, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const pipeline = await prisma.pipeline.update({
    where: { id: pipelineId },
    data: {
      ...(body.name ? { name: body.name } : {}),
    },
  });

  return NextResponse.json(pipeline);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; pipelineId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, pipelineId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const existing = await prisma.pipeline.findFirst({
    where: { id: pipelineId, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const stageIds = (
    await prisma.pipelineStage.findMany({
      where: { pipelineId },
      select: { id: true },
    })
  ).map((s) => s.id);

  if (stageIds.length > 0) {
    await prisma.contact.updateMany({
      where: { pipelineStageId: { in: stageIds } },
      data: { pipelineStageId: null },
    });
    await prisma.company.updateMany({
      where: { pipelineStageId: { in: stageIds } },
      data: { pipelineStageId: null },
    });
  }

  await prisma.pipeline.delete({ where: { id: pipelineId } });

  return NextResponse.json({ ok: true });
}
