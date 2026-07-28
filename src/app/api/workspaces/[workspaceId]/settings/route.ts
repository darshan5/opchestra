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

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { invoicePaymentDueDays: true, invoiceDefaultTaxRate: true, taskDetailDefaultTab: true },
    });

    return NextResponse.json(workspace);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(
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

    if (!membership || (membership.role !== 'SUPER_ADMIN' && membership.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.invoicePaymentDueDays !== undefined) {
      const days = parseInt(body.invoicePaymentDueDays, 10);
      if (!isNaN(days) && days >= 0 && days <= 365) {
        data.invoicePaymentDueDays = days;
      }
    }

    if (body.invoiceDefaultTaxRate !== undefined) {
      const rate = parseFloat(body.invoiceDefaultTaxRate);
      if (!isNaN(rate) && rate >= 0 && rate <= 100) {
        data.invoiceDefaultTaxRate = rate;
      }
    }

    if (body.taskDetailDefaultTab !== undefined) {
      const valid = ['timelog', 'details', 'notes'];
      if (valid.includes(body.taskDetailDefaultTab)) {
        data.taskDetailDefaultTab = body.taskDetailDefaultTab;
      }
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
      select: { invoicePaymentDueDays: true, invoiceDefaultTaxRate: true, taskDetailDefaultTab: true },
    });

    return NextResponse.json(workspace);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
