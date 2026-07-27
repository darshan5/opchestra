import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateTicketNumber } from '@/lib/ticket-number';

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
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {
      workspaceId,
      ticketNumber: { not: null },
    };
    if (status) {
      where.status = status;
    }

    const tickets = await prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, name: true, email: true } },
        ticketCompany: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(tickets);
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
    const ticketNumber = await generateTicketNumber(workspaceId);

    const ticket = await prisma.task.create({
      data: {
        workspaceId,
        createdById: session.user.id,
        title: body.subject || body.title,
        description: body.description || null,
        status: 'Open',
        priority: body.priority || 'MEDIUM',
        assigneeId: body.assigneeId || null,
        contactId: body.contactId || null,
        companyId: body.companyId || null,
        source: body.source || 'Manual',
        ticketNumber,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, name: true, email: true } },
        ticketCompany: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(ticket, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
