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
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const typeFilter = req.nextUrl.searchParams.get('type');

  const forms = await prisma.formTemplate.findMany({
    where: {
      workspaceId,
      ...(typeFilter ? { type: typeFilter as 'ORDER' | 'INTAKE' | 'ONBOARDING' | 'CONTACT' } : {}),
    },
    include: {
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(forms);
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
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const validTypes = ['ORDER', 'INTAKE', 'ONBOARDING', 'CONTACT'];
  if (!body.type || !validTypes.includes(body.type)) {
    return NextResponse.json({ error: 'Valid type is required (ORDER, INTAKE, ONBOARDING, CONTACT)' }, { status: 400 });
  }

  const form = await prisma.formTemplate.create({
    data: {
      workspaceId,
      name: body.name,
      type: body.type,
      fields: body.fields ?? [],
      rules: body.rules ?? null,
      published: body.published ?? true,
    },
    include: {
      _count: { select: { submissions: true } },
    },
  });

  return NextResponse.json(form, { status: 201 });
}
