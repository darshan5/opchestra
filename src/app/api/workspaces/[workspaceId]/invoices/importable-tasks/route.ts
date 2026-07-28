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
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      workspaceId,
      ticketNumber: null,
      status: 'Done',
      timeEntries: {
        some: { billable: true },
      },
      updatedAt: { gte: ninetyDaysAgo },
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        ticketCompany: { select: { id: true, name: true, hourlyRate: true } },
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        timeEntries: {
          where: { billable: true },
          select: {
            id: true,
            duration: true,
            date: true,
            notes: true,
          },
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const result = tasks.map((task) => {
      const totalMinutes = task.timeEntries.reduce((sum: number, te: { duration: number }) => sum + te.duration, 0);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      return {
        id: task.id,
        title: task.title,
        projectName: task.project?.name ?? null,
        assigneeName: task.assignee?.name ?? null,
        companyId: task.companyId,
        companyName: task.ticketCompany?.name ?? null,
        hourlyRate: task.ticketCompany?.hourlyRate ?? 0,
        totalHours,
        totalMinutes,
        timeEntries: task.timeEntries.map((te: { id: string; duration: number; date: Date; notes: string | null }) => ({
          id: te.id,
          duration: te.duration,
          hours: Math.round((te.duration / 60) * 100) / 100,
          date: te.date,
          notes: te.notes,
        })),
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
