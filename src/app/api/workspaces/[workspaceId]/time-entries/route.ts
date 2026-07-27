import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const userId = searchParams.get('userId');

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(membership.role);

    const where: Record<string, unknown> = {
      task: { workspaceId },
    };

    if (userId && userId !== 'all') {
      where.userId = userId;
    } else if (!userId || !isAdmin) {
      where.userId = session.user.id;
    }

    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) {
        dateFilter.gte = new Date(from);
      }
      if (to) {
        dateFilter.lte = new Date(to);
      }
      where.date = dateFilter;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        task: {
          select: {
            id: true,
            title: true,
            priority: true,
            project: { select: { id: true, name: true } },
            taskGroup: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
    const billableMinutes = entries.filter((e) => e.billable).reduce((s, e) => s + e.duration, 0);

    return NextResponse.json({
      billableMinutes,
      entries,
      isAdmin,
      role: membership.role,
      totalMinutes,
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
