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

function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
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
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const statusFilter = sp.get('status');
  const clientIdFilter = sp.get('clientId');
  const serviceIdFilter = sp.get('serviceId');

  const where: Record<string, unknown> = { workspaceId };
  if (statusFilter) where.status = statusFilter;
  if (serviceIdFilter) where.serviceId = serviceIdFilter;

  if (membership.role === 'CLIENT') {
    where.clientId = session.user.id;
  } else if (clientIdFilter) {
    where.clientId = clientIdFilter;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      service: { select: { id: true, name: true, price: true } },
      client: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true, tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(orders);
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
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership || !isManager(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  if (!body.clientId || !body.serviceId) {
    return NextResponse.json({ error: 'clientId and serviceId are required' }, { status: 400 });
  }

  const service = await prisma.service.findFirst({
    where: { id: body.serviceId, workspaceId },
    include: {
      variants: true,
      taskTemplates: { orderBy: { position: 'asc' } },
      formLinks: { where: { linkType: 'intake' } },
    },
  });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const quantity = body.quantity ?? 1;
  let unitPrice = service.price;

  if (body.variantId) {
    const variant = service.variants.find((v) => v.id === body.variantId);
    if (variant) unitPrice = variant.price;
  }

  const totalPrice = unitPrice * quantity + (service.setupFee ?? 0);

  const hasIntake = service.formLinks.length > 0;
  const initialStatus = hasIntake ? 'PENDING' : 'SUBMITTED';

  const dueDate = service.deadline
    ? addBusinessDays(new Date(), service.deadline)
    : null;

  const order = await prisma.order.create({
    data: {
      workspaceId,
      clientId: body.clientId,
      serviceId: body.serviceId,
      variantId: body.variantId ?? null,
      quantity,
      totalPrice,
      status: initialStatus,
      intakeComplete: !hasIntake,
      assigneeId: body.assigneeId ?? service.autoAssigneeId ?? null,
      priority: body.priority ?? 0,
      notes: body.notes ?? null,
      dueDate,
    },
  });

  if (service.taskTemplates.length > 0) {
    await prisma.task.createMany({
      data: service.taskTemplates.map((tmpl, idx) => ({
        workspaceId,
        title: tmpl.name,
        description: tmpl.description ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tmpl.description }] }] } : undefined,
        status: 'Todo',
        assigneeId: tmpl.assigneeId ?? order.assigneeId ?? null,
        createdById: session.user!.id,
        orderId: order.id,
        position: idx,
        endDate: tmpl.deadlineDays && dueDate
          ? addBusinessDays(new Date(), tmpl.deadlineDays)
          : null,
      })),
    });
  }

  const created = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      service: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true, tasks: true } },
    },
  });

  return NextResponse.json(created, { status: 201 });
}
