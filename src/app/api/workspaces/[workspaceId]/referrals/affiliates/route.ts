import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function GET(
  _req: NextRequest,
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

  const affiliates = await prisma.affiliate.findMany({
    where: { programId: program.id },
    include: {
      client: { select: { id: true, name: true, email: true } },
      _count: { select: { commissions: true, clicks: true } },
      commissions: { select: { amount: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    affiliates.map((a) => ({
      id: a.id,
      clientId: a.clientId,
      clientName: a.client.name,
      clientEmail: a.client.email,
      code: a.code,
      approved: a.approved,
      linkedCouponId: a.linkedCouponId,
      totalEarned: a.commissions.reduce((sum, c) => sum + c.amount, 0),
      commissionCount: a._count.commissions,
      clickCount: a._count.clicks,
      createdAt: a.createdAt,
    })),
  );
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

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let program = await prisma.referralProgram.findUnique({ where: { workspaceId } });
  if (!program) {
    program = await prisma.referralProgram.create({ data: { workspaceId } });
  }

  const { clientId } = await req.json();
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const existing = await prisma.affiliate.findFirst({
    where: { programId: program.id, clientId },
  });
  if (existing) {
    return NextResponse.json({ error: 'Client is already an affiliate' }, { status: 409 });
  }

  const code = generateCode();

  const affiliate = await prisma.affiliate.create({
    data: { programId: program.id, clientId, code },
    include: { client: { select: { name: true, email: true } } },
  });

  return NextResponse.json(affiliate, { status: 201 });
}
