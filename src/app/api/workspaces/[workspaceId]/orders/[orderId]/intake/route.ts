import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, orderId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isClient = membership.role === 'CLIENT';

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      workspaceId,
      ...(isClient ? { clientId: session.user.id } : {}),
    },
    select: { id: true, serviceId: true, intakeComplete: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const intakeLink = await prisma.serviceForm.findFirst({
    where: { serviceId: order.serviceId, linkType: 'intake' },
    include: {
      form: {
        select: { id: true, name: true, fields: true },
      },
    },
  });

  if (!intakeLink) {
    return NextResponse.json({ form: null, submission: null, intakeComplete: order.intakeComplete });
  }

  const submission = await prisma.formSubmission.findFirst({
    where: { orderId, formId: intakeLink.form.id },
  });

  return NextResponse.json({
    form: intakeLink.form,
    submission,
    intakeComplete: order.intakeComplete,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, orderId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const isClient = membership.role === 'CLIENT';

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      workspaceId,
      ...(isClient ? { clientId: session.user.id } : {}),
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const intakeLink = await prisma.serviceForm.findFirst({
    where: { serviceId: order.serviceId, linkType: 'intake' },
    include: { form: { select: { id: true } } },
  });

  if (!intakeLink) {
    return NextResponse.json({ error: 'No intake form for this service' }, { status: 400 });
  }

  const body = await req.json();

  const existing = await prisma.formSubmission.findFirst({
    where: { orderId, formId: intakeLink.form.id },
  });

  if (existing) {
    await prisma.formSubmission.update({
      where: { id: existing.id },
      data: { data: body.data ?? {}, completed: true },
    });
  } else {
    await prisma.formSubmission.create({
      data: {
        formId: intakeLink.form.id,
        orderId,
        clientId: isClient ? session.user.id : (order.clientId ?? null),
        data: body.data ?? {},
        completed: true,
      },
    });
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      intakeComplete: true,
      ...(order.status === 'PENDING' ? { status: 'SUBMITTED' } : {}),
    },
  });

  return NextResponse.json({ ok: true, status: updatedOrder.status });
}
