import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
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

    const views = await prisma.view.findMany({
      where: {
        workspaceId,
        OR: [{ createdById: session.user.id }, { isShared: true }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(views);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
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

    const body = await request.json();

    const view = await prisma.view.create({
      data: {
        workspaceId,
        createdById: session.user.id,
        name: body.name,
        layout: body.layout || 'TABLE',
        config: body.config || {},
        isShared: body.isShared || false,
      },
    });

    return NextResponse.json(view, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
