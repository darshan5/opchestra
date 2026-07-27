import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const groups = await prisma.taskGroup.findMany({
      where: { workspaceId, projectId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(groups);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, projectId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const lastGroup = await prisma.taskGroup.findFirst({
      where: { projectId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const group = await prisma.taskGroup.create({
      data: {
        workspaceId,
        projectId,
        name: parsed.data.name,
        color: parsed.data.color ?? '#6B7280',
        position: (lastGroup?.position ?? 0) + 1,
      },
      include: { _count: { select: { tasks: true } } },
    });

    return NextResponse.json(group, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
