import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; viewId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, viewId } = await params;

    const view = await prisma.view.findUnique({ where: { id: viewId } });
    if (!view || view.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 });
    }

    if (view.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const updated = await prisma.view.update({
      where: { id: viewId },
      data: {
        name: body.name ?? view.name,
        layout: body.layout ?? view.layout,
        config: body.config ?? view.config,
        isShared: body.isShared ?? view.isShared,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; viewId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, viewId } = await params;

    const view = await prisma.view.findUnique({ where: { id: viewId } });
    if (!view || view.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 });
    }

    if (view.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.view.delete({ where: { id: viewId } });

    return NextResponse.json({ message: 'View deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
