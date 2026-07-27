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

    // Check if there's already a timer for this task
    const existingForTask = await prisma.activeTimer.findUnique({
      where: { userId_taskId: { userId: session.user.id, taskId } },
    });

    if (existingForTask) {
      // Resume it if paused
      if (existingForTask.pausedAt) {
        const pausedDuration = Math.floor(
          (Date.now() - existingForTask.pausedAt.getTime()) / 1000,
        );
        const timer = await prisma.activeTimer.update({
          where: { id: existingForTask.id },
          data: {
            pausedAt: null,
            totalPaused: existingForTask.totalPaused + pausedDuration,
          },
          include: { task: { select: { id: true, title: true, projectId: true } } },
        });
        return NextResponse.json(timer);
      }
      // Already running on this task
      return NextResponse.json(existingForTask);
    }

    // Pause any currently RUNNING timer (not paused ones)
    const runningTimer = await prisma.activeTimer.findFirst({
      where: { userId: session.user.id, pausedAt: null },
    });

    if (runningTimer) {
      await prisma.activeTimer.update({
        where: { id: runningTimer.id },
        data: { pausedAt: new Date() },
      });
    }

    // Create new timer
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
