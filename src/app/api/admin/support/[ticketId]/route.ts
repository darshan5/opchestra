import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'support.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticketId } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'support.write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticketId } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.status) {
      data.status = body.status;
    }
    if (body.priority) {
      data.priority = body.priority;
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data,
    });

    return NextResponse.json(ticket);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
