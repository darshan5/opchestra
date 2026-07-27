import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; invoiceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, invoiceId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        workspace: { select: { name: true } },
        company: { select: { id: true, name: true, domain: true } },
        contact: { select: { id: true, name: true, email: true, phone: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; invoiceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, invoiceId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'PAID' && !existing.paidAt) {
        data.paidAt = new Date();
      }
      if (body.status === 'SENT' && !existing.sentAt) {
        data.sentAt = new Date();
      }
    }
    if (body.companyId !== undefined) {
      data.companyId = body.companyId;
    }
    if (body.contactId !== undefined) {
      data.contactId = body.contactId;
    }
    if (body.issueDate !== undefined) {
      data.issueDate = new Date(body.issueDate);
    }
    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }
    if (body.notes !== undefined) {
      data.notes = body.notes;
    }

    if (body.items !== undefined) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId } });

      const items = body.items.map(
        (item: { amount?: number; description: string; projectId?: string; quantity?: number; rate?: number; taskId?: string }) => ({
          amount: item.amount ?? (item.quantity ?? 1) * (item.rate ?? 0),
          description: item.description,
          invoiceId,
          projectId: item.projectId || null,
          quantity: item.quantity ?? 1,
          rate: item.rate ?? 0,
          taskId: item.taskId || null,
        }),
      );

      await prisma.invoiceItem.createMany({ data: items });

      const subtotal = items.reduce(
        (sum: number, item: { amount: number }) => sum + item.amount,
        0,
      );
      const taxRate = body.taxRate ?? 0;
      const taxAmount = subtotal * (taxRate / 100);
      data.subtotal = subtotal;
      data.tax = taxAmount;
      data.total = subtotal + taxAmount;
    }

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data,
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, name: true, email: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; invoiceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, invoiceId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only draft invoices can be deleted' }, { status: 400 });
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });
    return NextResponse.json({ message: 'Invoice deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
