import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

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

    const timer = await prisma.activeTimer.findFirst({
      where: { userId: session.user.id, workspaceId },
      include: { task: { select: { id: true, title: true, projectId: true } } },
    });

    if (!timer) {
      return NextResponse.json(null);
    }

    // Auto-stop if running > 12 hours
    const elapsed = Date.now() - timer.startedAt.getTime();
    if (elapsed > TWELVE_HOURS_MS) {
      const durationSec = Math.floor((TWELVE_HOURS_MS - timer.totalPaused * 1000) / 1000);
      const durationMin = Math.max(1, Math.round(durationSec / 60));

      await prisma.$transaction([
        prisma.timeEntry.create({
          data: {
            taskId: timer.taskId,
            userId: timer.userId,
            startTime: timer.startedAt,
            endTime: new Date(timer.startedAt.getTime() + TWELVE_HOURS_MS),
            duration: durationMin,
            date: timer.startedAt,
            notes: timer.notes ? `${timer.notes} (auto-stopped at 12h)` : 'Auto-stopped at 12 hours',
            billable: timer.billable,
          },
        }),
        prisma.activeTimer.delete({ where: { id: timer.id } }),
      ]);

      return NextResponse.json(null);
    }

    return NextResponse.json(timer);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
