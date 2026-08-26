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
  { params }: { params: Promise<{ workspaceId: string; serviceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, serviceId } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId },
    select: { id: true },
  });
  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const templates = await prisma.taskTemplate.findMany({
    where: { serviceId },
    orderBy: { position: 'asc' },
  });

  return NextResponse.json(templates);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; serviceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, serviceId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId },
    select: { id: true },
  });
  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const body = await req.json();

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const lastTemplate = await prisma.taskTemplate.findFirst({
    where: { serviceId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const template = await prisma.taskTemplate.create({
    data: {
      serviceId,
      name: body.name,
      description: body.description ?? null,
      position: body.position ?? (lastTemplate?.position ?? -1) + 1,
      assigneeId: body.assigneeId ?? null,
      deadlineDays: body.deadlineDays ?? null,
      visibleToClient: body.visibleToClient ?? false,
      assignedToClient: body.assignedToClient ?? false,
    },
  });

  return NextResponse.json(template, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; serviceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, serviceId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const templateId = req.nextUrl.searchParams.get('templateId');
  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
  }

  const template = await prisma.taskTemplate.findFirst({
    where: { id: templateId, serviceId },
  });
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  await prisma.taskTemplate.delete({ where: { id: templateId } });

  return NextResponse.json({ ok: true });
}
