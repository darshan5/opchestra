import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

function isManager(role: string) {
  return ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const statusFilter = sp.get('status');
  const clientIdFilter = sp.get('clientId');

  const where: Record<string, unknown> = { workspaceId };
  if (statusFilter) where.status = statusFilter;

  if (membership.role === 'CLIENT') {
    where.clientId = session.user.id;
  } else if (clientIdFilter) {
    where.clientId = clientIdFilter;
  }

  const subscriptions = await prisma.subscription.findMany({
    where,
    include: {
      service: { select: { id: true, name: true, price: true, recurringInterval: true } },
      client: { select: { id: true, name: true, email: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(subscriptions);
}
