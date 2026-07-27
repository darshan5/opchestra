import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string; phaseId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId, phaseId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) { data.name = body.name; }
    if (body.color !== undefined) { data.color = body.color; }
    if (body.position !== undefined) { data.position = body.position; }
    const phase = await prisma.phase.update({
      where: { id: phaseId },
      data,
      include: { _count: { select: { tasks: true } } },
    });
    return NextResponse.json(phase);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; projectId: string; phaseId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId, phaseId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await prisma.task.updateMany({ where: { phaseId }, data: { phaseId: null } });
    await prisma.phase.delete({ where: { id: phaseId } });
    return NextResponse.json({ message: 'Phase deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
