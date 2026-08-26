import { NextRequest, NextResponse } from 'next/server';

import bcrypt from 'bcryptjs';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateInvoiceNumber } from '@/lib/invoice-number';

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

function addInterval(from: Date, interval: string): Date {
  const result = new Date(from);
  switch (interval) {
    case 'WEEKLY':
      result.setDate(result.getDate() + 7);
      break;
    case 'MONTHLY':
      result.setMonth(result.getMonth() + 1);
      break;
    case 'QUARTERLY':
      result.setMonth(result.getMonth() + 3);
      break;
    case 'YEARLY':
      result.setFullYear(result.getFullYear() + 1);
      break;
  }
  return result;
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
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { serviceId, variantId, quantity: rawQuantity, clientId, email, name } = body;

  if (!serviceId) {
    return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId },
    include: {
      variants: true,
      taskTemplates: { orderBy: { position: 'asc' } },
      formLinks: { where: { linkType: 'intake' } },
    },
  });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  let resolvedClientId = clientId;

  if (!resolvedClientId && email) {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
      user = await prisma.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          emailVerified: new Date(),
          isClient: true,
        },
      });
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (!existingMember) {
      await prisma.workspaceMember.create({
        data: { workspaceId, userId: user.id, role: 'CLIENT' },
      });
    }

    resolvedClientId = user.id;
  }

  if (!resolvedClientId) {
    if (membership.role === 'CLIENT') {
      resolvedClientId = session.user.id;
    } else {
      return NextResponse.json({ error: 'clientId or email is required' }, { status: 400 });
    }
  }

  const quantity = rawQuantity ?? 1;
  let unitPrice = service.price;

  if (variantId) {
    const variant = service.variants.find((v) => v.id === variantId);
    if (variant) unitPrice = variant.price;
  }

  const subtotal = unitPrice * quantity;
  const setupFee = service.setupFee ?? 0;
  const totalPrice = subtotal + setupFee;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { invoiceDefaultTaxRate: true, invoicePaymentDueDays: true },
  });

  const taxRate = workspace?.invoiceDefaultTaxRate ?? 0;
  const tax = subtotal * (taxRate / 100);
  const invoiceTotal = totalPrice + tax;

  const invoiceNumber = await generateInvoiceNumber(workspaceId);

  const now = new Date();
  const invoiceDueDays = workspace?.invoicePaymentDueDays ?? 30;
  const invoiceDueDate = new Date(now);
  invoiceDueDate.setDate(invoiceDueDate.getDate() + invoiceDueDays);

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId,
      invoiceNumber,
      clientId: resolvedClientId,
      status: 'SENT',
      issueDate: now,
      dueDate: invoiceDueDate,
      subtotal,
      tax,
      total: invoiceTotal,
      sentAt: now,
      items: {
        create: [
          {
            description: service.name + (variantId ? ` (variant)` : ''),
            quantity,
            rate: unitPrice,
            amount: subtotal,
            position: 0,
          },
          ...(setupFee > 0
            ? [
                {
                  description: 'Setup fee',
                  quantity: 1,
                  rate: setupFee,
                  amount: setupFee,
                  position: 1,
                },
              ]
            : []),
        ],
      },
    },
  });

  const hasIntake = service.formLinks.length > 0;
  const initialStatus = hasIntake ? 'PENDING' : 'SUBMITTED';
  const dueDate = service.deadline ? addBusinessDays(now, service.deadline) : null;

  let subscriptionId: string | null = null;

  if (service.pricingType === 'RECURRING' && service.recurringInterval) {
    const subscription = await prisma.subscription.create({
      data: {
        workspaceId,
        clientId: resolvedClientId,
        serviceId: service.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: addInterval(now, service.recurringInterval),
      },
    });
    subscriptionId = subscription.id;
  }

  const order = await prisma.order.create({
    data: {
      workspaceId,
      clientId: resolvedClientId,
      serviceId: service.id,
      invoiceId: invoice.id,
      subscriptionId,
      variantId: variantId ?? null,
      quantity,
      totalPrice,
      status: initialStatus,
      intakeComplete: !hasIntake,
      assigneeId: service.autoAssigneeId ?? null,
      dueDate,
    },
  });

  if (service.taskTemplates.length > 0) {
    await prisma.task.createMany({
      data: service.taskTemplates.map((tmpl, idx) => ({
        workspaceId,
        title: tmpl.name,
        description: tmpl.description
          ? {
              type: 'doc',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: tmpl.description }],
                },
              ],
            }
          : undefined,
        status: 'Todo',
        assigneeId: tmpl.assigneeId ?? order.assigneeId ?? null,
        createdById: session.user!.id,
        orderId: order.id,
        position: idx,
        endDate:
          tmpl.deadlineDays && dueDate
            ? addBusinessDays(now, tmpl.deadlineDays)
            : null,
      })),
    });
  }

  const result = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      service: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true } },
      invoice: { select: { id: true, invoiceNumber: true, total: true, publicKey: true } },
      subscription: { select: { id: true, status: true } },
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
