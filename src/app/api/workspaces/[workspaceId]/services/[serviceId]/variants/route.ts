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
  { params }: { params: Promise<{ workspaceId: string; serviceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, serviceId } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId },
    select: { id: true },
  });
  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const variants = await prisma.serviceVariant.findMany({
    where: { serviceId },
    orderBy: { position: 'asc' },
  });

  return NextResponse.json(variants);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; serviceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, serviceId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId },
    select: { id: true },
  });
  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const body = await req.json();

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (body.price === undefined || typeof body.price !== 'number') {
    return NextResponse.json({ error: 'Price is required' }, { status: 400 });
  }

  const lastVariant = await prisma.serviceVariant.findFirst({
    where: { serviceId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const variant = await prisma.serviceVariant.create({
    data: {
      serviceId,
      name: body.name,
      price: body.price,
      options: body.options ?? {},
      position: body.position ?? (lastVariant?.position ?? -1) + 1,
    },
  });

  return NextResponse.json(variant, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; serviceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, serviceId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const variantId = req.nextUrl.searchParams.get('variantId');
  if (!variantId) {
    return NextResponse.json({ error: 'variantId is required' }, { status: 400 });
  }

  const variant = await prisma.serviceVariant.findFirst({
    where: { id: variantId, serviceId },
  });
  if (!variant) {
    return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
  }

  await prisma.serviceVariant.delete({ where: { id: variantId } });

  return NextResponse.json({ ok: true });
}
