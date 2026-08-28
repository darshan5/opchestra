import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getManagerMembership(workspaceId: string, userId: string) {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(m.role)) return null;
  return m;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; pageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId, pageId } = await params;

  const page = await prisma.portalPage.findFirst({
    where: { id: pageId, workspaceId },
  });
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(page);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; pageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId, pageId } = await params;
  if (!await getManagerMembership(workspaceId, session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ['title', 'slug', 'content', 'published', 'position'] as const) {
    if (key in body) data[key] = body[key];
  }

  const page = await prisma.portalPage.update({
    where: { id: pageId },
    data,
  });

  return NextResponse.json(page);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; pageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId, pageId } = await params;
  if (!await getManagerMembership(workspaceId, session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.portalPage.delete({ where: { id: pageId } });

  return NextResponse.json({ ok: true });
}
