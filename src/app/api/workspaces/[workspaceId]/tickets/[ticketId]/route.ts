import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; ticketId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId, ticketId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.task.findUnique({ where: { id: ticketId } });
    if (!existing || existing.workspaceId !== workspaceId || !existing.ticketNumber) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = { lastActivityAt: new Date() };

    if (body.assigneeId !== undefined) {
      data.assigneeId = body.assigneeId;
    }
    if (body.status !== undefined) {
      data.status = body.status;
      const doneStatuses = ['Closed', 'Resolved'];
      if (doneStatuses.includes(body.status) && !existing.completedAt) {
        data.completedAt = new Date();
      }
    }

    const ticket = await prisma.task.update({
      where: { id: ticketId },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
