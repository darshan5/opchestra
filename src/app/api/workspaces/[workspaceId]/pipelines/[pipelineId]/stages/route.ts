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
  });
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId },
    orderBy: { position: 'asc' },
    include: {
      _count: { select: { contacts: true, companies: true } },
    },
  });

  return NextResponse.json(stages);
}

export async function POST(
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

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, workspaceId },
  });
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  const body = await req.json();

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const lastStage = await prisma.pipelineStage.findFirst({
    where: { pipelineId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const stage = await prisma.pipelineStage.create({
    data: {
      pipelineId,
      name: body.name,
      color: body.color ?? '#6366f1',
      position: body.position ?? (lastStage?.position ?? -1) + 1,
    },
    include: {
      _count: { select: { contacts: true, companies: true } },
    },
  });

  return NextResponse.json(stage, { status: 201 });
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

  const stageId = req.nextUrl.searchParams.get('stageId');
  if (!stageId) {
    return NextResponse.json({ error: 'stageId query param required' }, { status: 400 });
  }

  const existing = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.color !== undefined) data.color = body.color;
  if (body.position !== undefined) data.position = body.position;
  if (body.automations !== undefined) data.automations = body.automations;

  const stage = await prisma.pipelineStage.update({
    where: { id: stageId },
    data,
    include: {
      _count: { select: { contacts: true, companies: true } },
    },
  });

  return NextResponse.json(stage);
}

export async function DELETE(
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

  const stageId = req.nextUrl.searchParams.get('stageId');
  if (!stageId) {
    return NextResponse.json({ error: 'stageId query param required' }, { status: 400 });
  }

  const existing = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
  }

  await prisma.contact.updateMany({
    where: { pipelineStageId: stageId },
    data: { pipelineStageId: null },
  });
  await prisma.company.updateMany({
    where: { pipelineStageId: stageId },
    data: { pipelineStageId: null },
  });

  await prisma.pipelineStage.delete({ where: { id: stageId } });

  return NextResponse.json({ ok: true });
}
