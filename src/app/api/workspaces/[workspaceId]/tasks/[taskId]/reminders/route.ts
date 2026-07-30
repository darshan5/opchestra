import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;

    const reminders = await prisma.taskReminder.findMany({
      where: { taskId },
      orderBy: { triggerAt: 'asc' },
    });

    return NextResponse.json(reminders);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

const OFFSETS: Record<string, number> = {
  on_due_date: 0,
  '1_day_before': 1,
  '3_days_before': 3,
  '1_week_before': 7,
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, taskId } = await params;
    const body = await request.json();
    const { reminderType } = body;

    if (!reminderType || !OFFSETS.hasOwnProperty(reminderType)) {
      return NextResponse.json({ error: 'Invalid reminder type' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { endDate: true, assigneeId: true, workspaceId: true },
    });

    if (!task || task.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!task.endDate) {
      return NextResponse.json({ error: 'Task has no due date' }, { status: 400 });
    }

    if (!task.assigneeId) {
      return NextResponse.json({ error: 'Task has no assignee' }, { status: 400 });
    }

    const triggerAt = new Date(task.endDate);
    triggerAt.setDate(triggerAt.getDate() - OFFSETS[reminderType]);
    triggerAt.setHours(9, 0, 0, 0);

    const existing = await prisma.taskReminder.findFirst({
      where: { taskId, reminderType, sent: false },
    });

    if (existing) {
      return NextResponse.json({ error: 'Reminder already set' }, { status: 409 });
    }

    const reminder = await prisma.taskReminder.create({
      data: {
        taskId,
        userId: task.assigneeId,
        workspaceId,
        reminderType,
        triggerAt,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get('id');

    if (!reminderId) {
      return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 });
    }

    await prisma.taskReminder.delete({ where: { id: reminderId } });

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
