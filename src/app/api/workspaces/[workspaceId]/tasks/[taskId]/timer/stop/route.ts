import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    const timer = await prisma.activeTimer.findUnique({
      where: { userId_taskId: { userId: session.user.id, taskId } },
    });

    if (!timer) {
      return NextResponse.json({ error: 'No active timer' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const notes = body.notes ?? timer.notes;
    const billable = body.billable ?? timer.billable;
    const category = body.category ?? timer.category;

    const now = Date.now();
    let pausedMs = timer.totalPaused * 1000;
    if (timer.pausedAt) {
      pausedMs += now - timer.pausedAt.getTime();
    }
    const elapsedMs = now - timer.startedAt.getTime();
    const durationSec = Math.max(0, Math.floor((elapsedMs - pausedMs) / 1000));
    const durationMin = Math.max(1, Math.round(durationSec / 60));

    const [entry] = await prisma.$transaction([
      prisma.timeEntry.create({
        data: {
          taskId: timer.taskId,
          userId: timer.userId,
          startTime: timer.startedAt,
          endTime: new Date(),
          duration: durationMin,
          date: timer.startedAt,
          notes: notes || undefined,
          category: category || null,
          billable,
        },
      }),
      prisma.activeTimer.delete({ where: { id: timer.id } }),
    ]);

    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
