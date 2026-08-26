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
    include: {
      category: { select: { id: true, name: true } },
      variants: { orderBy: { position: 'asc' } },
      addOns: {
        include: {
          childService: { select: { id: true, name: true, price: true, currency: true } },
        },
      },
      taskTemplates: { orderBy: { position: 'asc' } },
      formLinks: {
        include: {
          form: { select: { id: true, name: true, type: true } },
        },
      },
    },
  });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  return NextResponse.json(service);
}

export async function PATCH(
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

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const body = await req.json();
  const allowed = [
    'name', 'description', 'descriptionHtml', 'price', 'currency',
    'pricingType', 'recurringInterval', 'recurringBehavior',
    'trialDays', 'setupFee', 'maxRequests', 'deadline',
    'autoAssigneeId', 'published', 'categoryId', 'position',
  ] as const;

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      data[key] = body[key];
    }
  }

  const service = await prisma.service.update({
    where: { id: serviceId },
    data,
    include: {
      category: { select: { id: true, name: true } },
      variants: { orderBy: { position: 'asc' } },
      _count: { select: { taskTemplates: true } },
    },
  });

  return NextResponse.json(service);
}

export async function DELETE(
  _req: NextRequest,
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

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  await prisma.service.delete({ where: { id: serviceId } });

  return NextResponse.json({ ok: true });
}
