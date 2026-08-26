import { NextRequest, NextResponse } from 'next/server';

import bcrypt from 'bcryptjs';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getManagerMembership(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(membership.role)) {
    return null;
  }
  return membership;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clients = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: 'CLIENT' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          isClient: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(clients.map((c) => ({
    id: c.id,
    userId: c.user.id,
    email: c.user.email,
    name: c.user.name,
    createdAt: c.createdAt,
  })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getManagerMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email, name, password } = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : await bcrypt.hash(crypto.randomUUID(), 10);

    user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        emailVerified: new Date(),
        isClient: true,
      },
    });
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });

  if (existing) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
  }

  const member = await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: user.id,
      role: 'CLIENT',
    },
  });

  return NextResponse.json({
    id: member.id,
    userId: user.id,
    email: user.email,
    name: user.name,
    createdAt: member.createdAt,
  }, { status: 201 });
}
