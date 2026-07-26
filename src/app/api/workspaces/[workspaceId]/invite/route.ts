import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';

import { auth } from '@/lib/auth';
import { hasRole } from '@/lib/auth/session';
import { inviteMemberSchema } from '@/lib/auth/validation';
import { prisma } from '@/lib/db';
import { sendInviteEmail } from '@/lib/email';

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

    if (!membership || !hasRole(membership.role, 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email: parsed.data.email },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    const token = uuid();
    const invite = await prisma.inviteToken.create({
      data: {
        token,
        email: parsed.data.email,
        workspaceId,
        role: parsed.data.role as 'ADMIN' | 'MANAGER' | 'MEMBER',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    await sendInviteEmail(parsed.data.email, token, workspace?.name ?? 'Workspace');

    return NextResponse.json({ id: invite.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
