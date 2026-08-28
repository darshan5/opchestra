import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; affiliateId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, affiliateId } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    include: {
      client: { select: { id: true, name: true, email: true } },
      commissions: { orderBy: { createdAt: 'desc' } },
      clicks: { orderBy: { createdAt: 'desc' }, take: 50 },
      _count: { select: { commissions: true, clicks: true } },
    },
  });

  if (!affiliate) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(affiliate);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; affiliateId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, affiliateId } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ('approved' in body) data.approved = body.approved;
  if ('linkedCouponId' in body) data.linkedCouponId = body.linkedCouponId;

  const affiliate = await prisma.affiliate.update({
    where: { id: affiliateId },
    data,
  });

  return NextResponse.json(affiliate);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; affiliateId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, affiliateId } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.affiliate.delete({ where: { id: affiliateId } });

  return NextResponse.json({ ok: true });
}
