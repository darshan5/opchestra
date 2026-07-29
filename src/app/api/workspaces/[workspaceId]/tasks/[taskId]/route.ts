import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { updateTaskSchema } from '@/lib/validations/task';

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

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        taskLabels: { include: { label: true } },
        subTasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, image: true } },
            _count: { select: { subTasks: true } },
          },
          orderBy: { position: 'asc' },
        },
        dependsOn: {
          include: {
            dependsOn: { select: { id: true, title: true, status: true } },
          },
        },
        dependedOnBy: {
          include: {
            task: { select: { id: true, title: true, status: true } },
          },
        },
        files: true,
        linkedTasks: { select: { id: true, title: true, status: true } },
        sourceTicket: { select: { id: true, title: true, ticketNumber: true } },
        ticketCompany: { select: { id: true, name: true } },
        _count: { select: { comments: true, subTasks: true } },
      },
    });

    if (!task || task.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(task);
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

    const { workspaceId, taskId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data: Record<string, unknown> = { lastActivityAt: new Date() };

    if (parsed.data.title !== undefined) {
      data.title = parsed.data.title;
    }
    if (parsed.data.description !== undefined) {
      data.description = parsed.data.description;
    }
    if (parsed.data.priority !== undefined) {
      data.priority = parsed.data.priority;
    }
    if (parsed.data.assigneeId !== undefined) {
      data.assigneeId = parsed.data.assigneeId;
    }
    if (parsed.data.projectId !== undefined) {
      data.projectId = parsed.data.projectId;
    }
    if (parsed.data.startDate !== undefined) {
      data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
    }
    if (parsed.data.endDate !== undefined) {
      data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
    }
    if (parsed.data.timeEstimate !== undefined) {
      data.timeEstimate = parsed.data.timeEstimate;
    }
    if (parsed.data.isMilestone !== undefined) {
      data.isMilestone = parsed.data.isMilestone;
    }
    if (parsed.data.taskGroupId !== undefined) {
      data.taskGroupId = parsed.data.taskGroupId;
    }
    if (parsed.data.phaseId !== undefined) {
      data.phaseId = parsed.data.phaseId;
    }
    if (parsed.data.sourceTicketId !== undefined) {
      data.sourceTicketId = parsed.data.sourceTicketId;
    }
    if (parsed.data.companyId !== undefined) {
      data.companyId = parsed.data.companyId;
    }
    if (parsed.data.position !== undefined) {
      data.position = parsed.data.position;
    }

    if (parsed.data.status !== undefined) {
      data.status = parsed.data.status;
      const doneStatuses = ['Done', 'Closed', 'Resolved'];
      if (doneStatuses.includes(parsed.data.status) && !existing.completedAt) {
        data.completedAt = new Date();
      } else if (!doneStatuses.includes(parsed.data.status) && existing.completedAt) {
        data.completedAt = null;
      }
    }

    const activityMessages: string[] = [];
    if (parsed.data.status !== undefined && parsed.data.status !== existing.status) {
      activityMessages.push(`changed status from ${existing.status} to ${parsed.data.status}`);
    }
    if (parsed.data.priority !== undefined && parsed.data.priority !== existing.priority) {
      activityMessages.push(
        `changed priority from ${existing.priority} to ${parsed.data.priority}`,
      );
    }
    if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== existing.assigneeId) {
      if (parsed.data.assigneeId) {
        const assignee = await prisma.user.findUnique({
          where: { id: parsed.data.assigneeId },
          select: { name: true, email: true },
        });
        activityMessages.push(`assigned to ${assignee?.name ?? assignee?.email ?? 'someone'}`);
      } else {
        activityMessages.push('removed assignee');
      }
    }

    if (activityMessages.length > 0) {
      await prisma.comment.create({
        data: {
          taskId,
          userId: session.user.id,
          content: { type: 'system', text: activityMessages.join(', ') },
        },
      });
    }

    if (parsed.data.assigneeId !== undefined && parsed.data.assigneeId !== existing.assigneeId) {
      if (parsed.data.assigneeId && parsed.data.assigneeId !== session.user.id) {
        createNotification(workspaceId, parsed.data.assigneeId, 'TASK_ASSIGNED', `You were assigned "${existing.title}"`, undefined, { taskId });
      }
      if (existing.assigneeId && existing.assigneeId !== session.user.id) {
        createNotification(workspaceId, existing.assigneeId, 'TASK_UNASSIGNED', `You were unassigned from "${existing.title}"`, undefined, { taskId });
      }
    }
    if (parsed.data.status !== undefined && parsed.data.status !== existing.status && existing.assigneeId && existing.assigneeId !== session.user.id) {
      createNotification(workspaceId, existing.assigneeId, 'TASK_STATUS_CHANGED', `"${existing.title}" status changed to ${parsed.data.status}`, undefined, { taskId });
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true } },
        taskGroup: { select: { id: true, name: true, color: true } },
        phase: { select: { id: true, name: true, color: true } },
        ticketCompany: { select: { id: true, name: true } },
        taskLabels: { include: { label: true } },
        _count: { select: { subTasks: true, comments: true } },
      },
    });

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
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

    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.activeTimer.deleteMany({ where: { taskId } });
    await prisma.note.deleteMany({ where: { entityType: 'task', entityId: taskId } });
    await prisma.task.delete({ where: { id: taskId } });

    return NextResponse.json({ message: 'Task deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
