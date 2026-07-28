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

    const timer = await prisma.activeTimer.findUnique({
      where: { userId_taskId: { userId: session.user.id, taskId } },
      include: { task: { select: { id: true, title: true, projectId: true } } },
    });

    if (!timer) {
      return NextResponse.json(null);
    }

    return NextResponse.json(timer);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; taskId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();

    const timer = await prisma.activeTimer.findUnique({
      where: { userId_taskId: { userId: session.user.id, taskId } },
    });

    if (!timer) {
      return NextResponse.json({ error: 'No active timer' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.notes !== undefined) {
      data.notes = body.notes;
    }
    if (body.billable !== undefined) {
      data.billable = body.billable;
    }

    const updated = await prisma.activeTimer.update({
      where: { id: timer.id },
      data,
      include: { task: { select: { id: true, title: true, projectId: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
