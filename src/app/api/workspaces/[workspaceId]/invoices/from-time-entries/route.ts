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

    const where: Record<string, unknown> = {
      billable: true,
      task: { workspaceId },
    };

    if (from || to) {
      where.date = {};
      if (from) {
        (where.date as Record<string, unknown>).gte = new Date(from);
      }
      if (to) {
        (where.date as Record<string, unknown>).lte = new Date(to);
      }
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            project: { select: { id: true, name: true } },
          },
        },
        user: { select: { name: true, email: true } },
      },
      orderBy: { date: 'desc' },
    });

    const byProject: Record<
      string,
      {
        projectId: string | null;
        projectName: string;
        entries: typeof entries;
        totalMinutes: number;
      }
    > = {};

    for (const entry of entries) {
      const key = entry.task.project?.id ?? 'no-project';
      if (!byProject[key]) {
        byProject[key] = {
          entries: [],
          projectId: entry.task.project?.id ?? null,
          projectName: entry.task.project?.name ?? 'No Project',
          totalMinutes: 0,
        };
      }
      byProject[key].entries.push(entry);
      byProject[key].totalMinutes += entry.duration;
    }

    return NextResponse.json(Object.values(byProject));
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
