import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string; entryId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { entryId } = await params;

    const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.notes !== undefined) {
      data.notes = body.notes || null;
    }
    if (body.billable !== undefined) {
      data.billable = body.billable;
    }

    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string; entryId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { entryId } = await params;

    const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.timeEntry.delete({ where: { id: entryId } });
    return NextResponse.json({ message: 'Deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
