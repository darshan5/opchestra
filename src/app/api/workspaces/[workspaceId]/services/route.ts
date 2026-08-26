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

  const publishedOnly = req.nextUrl.searchParams.get('published') === 'true';

  const services = await prisma.service.findMany({
    where: {
      workspaceId,
      ...(publishedOnly ? { published: true } : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      variants: { orderBy: { position: 'asc' } },
      _count: { select: { taskTemplates: true } },
    },
    orderBy: { position: 'asc' },
  });

  return NextResponse.json(services);
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

  if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
    return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 400 });
  }

  const lastService = await prisma.service.findFirst({
    where: { workspaceId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const service = await prisma.service.create({
    data: {
      workspaceId,
      name: body.name,
      description: body.description ?? null,
      descriptionHtml: body.descriptionHtml ?? null,
      price: body.price ?? 0,
      currency: body.currency ?? 'USD',
      pricingType: body.pricingType ?? 'ONE_TIME',
      recurringInterval: body.recurringInterval ?? null,
      recurringBehavior: body.recurringBehavior ?? 'NO_ACTION',
      trialDays: body.trialDays ?? null,
      setupFee: body.setupFee ?? null,
      maxRequests: body.maxRequests ?? null,
      deadline: body.deadline ?? null,
      autoAssigneeId: body.autoAssigneeId ?? null,
      published: body.published ?? false,
      categoryId: body.categoryId ?? null,
      position: (lastService?.position ?? -1) + 1,
    },
    include: {
      category: { select: { id: true, name: true } },
      variants: true,
      _count: { select: { taskTemplates: true } },
    },
  });

  return NextResponse.json(service, { status: 201 });
}
