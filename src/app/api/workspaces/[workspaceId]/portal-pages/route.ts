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
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId } = await params;

  const pages = await prisma.portalPage.findMany({
    where: { workspaceId },
    orderBy: { position: 'asc' },
    select: { id: true, title: true, slug: true, published: true, position: true, createdAt: true },
  });

  return NextResponse.json(pages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId } = await params;
  if (!await getManagerMembership(workspaceId, session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, slug, content, published } = await req.json();
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const pageSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const page = await prisma.portalPage.create({
    data: {
      workspaceId,
      title,
      slug: pageSlug,
      content: content || '',
      published: published ?? false,
    },
  });

  return NextResponse.json(page, { status: 201 });
}
