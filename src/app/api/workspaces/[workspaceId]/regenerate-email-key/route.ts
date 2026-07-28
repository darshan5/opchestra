import crypto from 'crypto';

import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export async function POST(
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

    if (!membership || !hasRole(membership.role, 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inboundEmailKey = crypto.randomBytes(8).toString('base64url').substring(0, 12);

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { inboundEmailKey },
      select: { inboundEmailKey: true },
    });

    return NextResponse.json(workspace);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
