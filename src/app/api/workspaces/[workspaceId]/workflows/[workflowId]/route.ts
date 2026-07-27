import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; workflowId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId, workflowId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership || !hasRole(membership.role, 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.statusWorkflow.findUnique({ where: { id: workflowId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const workflow = await prisma.statusWorkflow.update({
      where: { id: workflowId },
      data: {
        name: body.name ?? existing.name,
        statuses: body.statuses ?? existing.statuses,
      },
    });

    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; workflowId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { workspaceId, workflowId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership || !hasRole(membership.role, 'MANAGER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.statusWorkflow.findUnique({ where: { id: workflowId } });
    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (existing.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default workflow' }, { status: 400 });
    }

    await prisma.statusWorkflow.delete({ where: { id: workflowId } });
    return NextResponse.json({ message: 'Deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
