import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getAdminMembership(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
    return null;
  }
  return membership;
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
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let program = await prisma.referralProgram.findUnique({
    where: { workspaceId },
    include: {
      commissionRules: true,
      _count: { select: { affiliates: true } },
    },
  });

  if (!program) {
    program = await prisma.referralProgram.create({
      data: { workspaceId },
      include: {
        commissionRules: true,
        _count: { select: { affiliates: true } },
      },
    });
  }

  return NextResponse.json(program);
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
  const membership = await getAdminMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ['enabled', 'cookieDays', 'autoApproveAffiliates', 'autoApproveCommissions', 'redirectUrl'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const program = await prisma.referralProgram.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
    include: { commissionRules: true, _count: { select: { affiliates: true } } },
  });

  return NextResponse.json(program);
}
