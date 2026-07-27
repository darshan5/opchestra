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

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        currentPeriodEnd: true,
        id: true,
        name: true,
        seatLimit: true,
        stripePlanId: true,
        subscriptionStatus: true,
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const memberCount = await prisma.workspaceMember.count({ where: { workspaceId } });

    return NextResponse.json({ ...workspace, memberCount });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
