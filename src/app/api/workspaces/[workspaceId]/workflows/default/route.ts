import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
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

    let workflow = await prisma.statusWorkflow.findFirst({
      where: { workspaceId, isDefault: true },
    });

    if (!workflow) {
      workflow = await prisma.statusWorkflow.create({
        data: {
          workspaceId,
          name: 'Default',
          isDefault: true,
          statuses: [
            { name: 'Todo', color: '#6B7280', category: 'todo' },
            { name: 'In Progress', color: '#3B82F6', category: 'in_progress' },
            { name: 'Done', color: '#10B981', category: 'done' },
          ],
        },
      });
    }

    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(
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

    if (!membership || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { statuses } = await request.json();

    if (!Array.isArray(statuses) || statuses.length === 0) {
      return NextResponse.json({ error: 'At least one status is required' }, { status: 400 });
    }

    let workflow = await prisma.statusWorkflow.findFirst({
      where: { workspaceId, isDefault: true },
    });

    if (workflow) {
      workflow = await prisma.statusWorkflow.update({
        where: { id: workflow.id },
        data: { statuses },
      });
    } else {
      workflow = await prisma.statusWorkflow.create({
        data: {
          workspaceId,
          name: 'Default',
          isDefault: true,
          statuses,
        },
      });
    }

    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
