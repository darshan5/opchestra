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

    const { taskId } = await params;

    const timer = await prisma.activeTimer.findUnique({
      where: { userId_taskId: { userId: session.user.id, taskId } },
    });

    if (!timer) {
      return NextResponse.json({ error: 'No active timer' }, { status: 404 });
    }

    if (!timer.pausedAt) {
      return NextResponse.json({ error: 'Not paused' }, { status: 400 });
    }

    const pausedSeconds = Math.floor((Date.now() - timer.pausedAt.getTime()) / 1000);

    const updated = await prisma.activeTimer.update({
      where: { id: timer.id },
      data: {
        pausedAt: null,
        totalPaused: timer.totalPaused + pausedSeconds,
      },
      include: { task: { select: { id: true, title: true, projectId: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
