import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'users.write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, workspaceId, role } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const userPassword = password || generatePassword();
    const passwordHash = await bcrypt.hash(userPassword, 12);

    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          emailVerified: new Date(),
          mustChangePassword: !password,
        },
      });

      if (workspaceId) {
        await tx.workspaceMember.create({
          data: {
            workspaceId,
            userId: u.id,
            role: role || 'MEMBER',
          },
        });
      }

      return u;
    });

    await logAuditEvent('PROVISION_USER', admin.id, user.id, {
      email,
      workspaceId: workspaceId || null,
      role: role || null,
    });

    return NextResponse.json(
      {
        email: user.email,
        id: user.id,
        message: 'User provisioned successfully',
        name: user.name,
        password: userPassword,
        workspaceId: workspaceId || null,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
