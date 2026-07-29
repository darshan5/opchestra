import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

function fmtDur(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) {
    return `${m}m`;
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string; entryId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { taskId, entryId } = await params;

    const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!entry) {
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
    if (body.duration !== undefined && body.duration > 0) {
      data.duration = body.duration;
    }
    if (body.category !== undefined) {
      data.category = body.category || null;
    }

    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (body.duration !== undefined && body.duration !== entry.duration) {
      await prisma.comment.create({
        data: {
          taskId,
          userId: session.user.id,
          content: {
            type: 'system',
            text: `adjusted time entry from ${fmtDur(entry.duration)} to ${fmtDur(body.duration)}`,
          },
        },
      });
    }

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
    const { taskId, entryId } = await params;

    const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.timeEntry.delete({ where: { id: entryId } });

    await prisma.comment.create({
      data: {
        taskId,
        userId: session.user.id,
        content: {
          type: 'system',
          text: `deleted time entry (${fmtDur(entry.duration)})`,
        },
      },
    });

    return NextResponse.json({ message: 'Deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
