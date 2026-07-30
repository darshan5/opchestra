import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';

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

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, assigneeId: true, workspaceId: true },
    });

    if (!task || task.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.assigneeId) {
      return NextResponse.json({ error: 'No assignee to notify' }, { status: 400 });
    }

    if (task.assigneeId === session.user.id) {
      return NextResponse.json({ error: 'Cannot notify yourself' }, { status: 400 });
    }

    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    await createNotification(
      workspaceId,
      task.assigneeId,
      'TASK_ASSIGNED',
      `${sender?.name ?? 'Someone'} wants you to check "${task.title}"`,
      undefined,
      { taskId },
    );

    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
