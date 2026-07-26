import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';

const acceptInviteSchema = z.object({
  token: z.string(),
  name: z.string().min(2),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: { workspace: { select: { name: true } } },
    });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
    }

    return NextResponse.json({
      email: invite.email,
      workspaceName: invite.workspace.name,
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = acceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token: parsed.data.token },
    });

    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    let user = await prisma.user.findUnique({ where: { email: invite.email } });

    if (user) {
      await prisma.$transaction([
        prisma.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: user.id,
            role: invite.role,
          },
        }),
        prisma.inviteToken.update({
          where: { id: invite.id },
          data: { usedAt: new Date() },
        }),
      ]);
    } else {
      user = await prisma.user.create({
        data: {
          email: invite.email,
          name: parsed.data.name,
          passwordHash,
          emailVerified: new Date(),
        },
      });

      await prisma.$transaction([
        prisma.workspaceMember.create({
          data: {
            workspaceId: invite.workspaceId,
            userId: user.id,
            role: invite.role,
          },
        }),
        prisma.inviteToken.update({
          where: { id: invite.id },
          data: { usedAt: new Date() },
        }),
      ]);
    }

    return NextResponse.json({ message: 'Invitation accepted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
