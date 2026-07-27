import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, taskId } = await params;

    // Auto-stop any existing timer for this user
    const existing = await prisma.activeTimer.findFirst({
      where: { userId: session.user.id },
    });

    if (existing) {
      const elapsed = Date.now() - existing.startedAt.getTime();
      let pausedMs = existing.totalPaused * 1000;
      if (existing.pausedAt) {
        pausedMs += Date.now() - existing.pausedAt.getTime();
      }
      const durationSec = Math.max(0, Math.floor((elapsed - pausedMs) / 1000));
      const durationMin = Math.max(1, Math.round(durationSec / 60));

      await prisma.$transaction([
        prisma.timeEntry.create({
          data: {
            taskId: existing.taskId,
            userId: existing.userId,
            startTime: existing.startedAt,
            endTime: new Date(),
            duration: durationMin,
            date: existing.startedAt,
            notes: existing.notes || undefined,
            billable: existing.billable,
          },
        }),
        prisma.activeTimer.delete({ where: { id: existing.id } }),
      ]);
    }

    const timer = await prisma.activeTimer.create({
      data: {
        taskId,
        userId: session.user.id,
        workspaceId,
      },
      include: { task: { select: { id: true, title: true, projectId: true } } },
    });

    return NextResponse.json(timer, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
