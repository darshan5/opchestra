import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const program = await prisma.referralProgram.findUnique({ where: { workspaceId } });
  if (!program) {
    return NextResponse.json([]);
  }

  const statusFilter = req.nextUrl.searchParams.get('status');

  const commissions = await prisma.commission.findMany({
    where: {
      affiliate: { programId: program.id },
      ...(statusFilter ? { status: statusFilter as 'UNAPPROVED' | 'UNPAID' | 'PAID' } : {}),
    },
    include: {
      affiliate: {
        include: { client: { select: { name: true, email: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    commissions.map((c) => ({
      id: c.id,
      affiliateId: c.affiliateId,
      affiliateName: c.affiliate.client.name,
      affiliateEmail: c.affiliate.client.email,
      orderId: c.orderId,
      amount: c.amount,
      status: c.status,
      paidAt: c.paidAt,
      createdAt: c.createdAt,
    })),
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
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

  const { ids, status } = await req.json();

  if (!Array.isArray(ids) || !['UNAPPROVED', 'UNPAID', 'PAID'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await prisma.commission.updateMany({
    where: { id: { in: ids } },
    data: {
      status,
      ...(status === 'PAID' ? { paidAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ ok: true, updated: ids.length });
}
