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

  const categories = await prisma.serviceCategory.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { services: true } },
    },
    orderBy: { position: 'asc' },
  });

  return NextResponse.json(categories);
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

  const lastCategory = await prisma.serviceCategory.findFirst({
    where: { workspaceId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const category = await prisma.serviceCategory.create({
    data: {
      workspaceId,
      name: body.name,
      position: body.position ?? (lastCategory?.position ?? -1) + 1,
    },
    include: {
      _count: { select: { services: true } },
    },
  });

  return NextResponse.json(category, { status: 201 });
}

export async function DELETE(
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

  const categoryId = req.nextUrl.searchParams.get('categoryId');
  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
  }

  const category = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, workspaceId },
  });
  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  await prisma.service.updateMany({
    where: { categoryId },
    data: { categoryId: null },
  });

  await prisma.serviceCategory.delete({ where: { id: categoryId } });

  return NextResponse.json({ ok: true });
}
