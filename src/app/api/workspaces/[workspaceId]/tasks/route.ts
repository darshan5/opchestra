import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { createTaskSchema } from '@/lib/validations/task';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const assigneeId = searchParams.get('assigneeId');
    const status = searchParams.get('status');
    const parentTaskId = searchParams.get('parentTaskId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { workspaceId };

    if (projectId) {
      where.projectId = projectId;
    }
    if (assigneeId) {
      where.assigneeId = assigneeId;
    }
    if (status) {
      where.status = status;
    }
    if (parentTaskId === 'null') {
      where.parentTaskId = null;
    } else if (parentTaskId) {
      where.parentTaskId = parentTaskId;
    }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true } },
        taskLabels: { include: { label: true } },
        _count: { select: { subTasks: true, comments: true } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    let depth = 0;
    if (parsed.data.parentTaskId) {
      const parent = await prisma.task.findUnique({
        where: { id: parsed.data.parentTaskId },
      });
      if (!parent || parent.workspaceId !== workspaceId) {
        return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
      }
      if (parent.depth >= 3) {
        return NextResponse.json(
          { error: 'Maximum sub-task depth (4 levels) reached' },
          { status: 400 },
        );
      }
      depth = parent.depth + 1;
    }

    const lastTask = await prisma.task.findFirst({
      where: { workspaceId, parentTaskId: parsed.data.parentTaskId ?? null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        workspaceId,
        createdById: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        status: parsed.data.status ?? 'Todo',
        priority: parsed.data.priority ?? 'NONE',
        assigneeId: parsed.data.assigneeId,
        projectId: parsed.data.projectId,
        parentTaskId: parsed.data.parentTaskId,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        timeEstimate: parsed.data.timeEstimate,
        isMilestone: parsed.data.isMilestone ?? false,
        taskGroupId: parsed.data.taskGroupId,
        depth,
        position: (lastTask?.position ?? 0) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        project: { select: { id: true, name: true } },
        taskLabels: { include: { label: true } },
        _count: { select: { subTasks: true, comments: true } },
      },
    });

    if (task.assigneeId && task.assigneeId !== session.user.id) {
      createNotification(
        workspaceId,
        task.assigneeId,
        'TASK_ASSIGNED',
        `You were assigned "${task.title}"`,
        task.project?.name ?? undefined,
        { taskId: task.id },
      );
    }

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
