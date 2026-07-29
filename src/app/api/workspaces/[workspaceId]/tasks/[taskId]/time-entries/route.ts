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
    const { workspaceId, taskId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entries = await prisma.timeEntry.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);

    return NextResponse.json({ entries, totalMinutes });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

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

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { duration, date, notes, billable, startTime, endTime, category } = body;

    if (!duration || duration <= 0) {
      return NextResponse.json({ error: 'Duration is required' }, { status: 400 });
    }

    const entry = await prisma.timeEntry.create({
      data: {
        taskId,
        userId: session.user.id,
        duration,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
        category: category || null,
        billable: billable ?? true,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const h = Math.floor(duration / 60);
    const m = duration % 60;
    const durStr = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    await prisma.comment.create({
      data: {
        taskId,
        userId: session.user.id,
        content: { type: 'system', text: `logged ${durStr}` },
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
