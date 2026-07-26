import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

const createAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'VIEWER']).default('ADMIN'),
});

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'admin-users.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admins = await prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, role: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(admins);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only SUPER_ADMIN can create admin users' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return NextResponse.json({ error: 'Admin user already exists' }, { status: 409 });
    }

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const newAdmin = await prisma.adminUser.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role,
        mustChangePassword: true,
      },
    });

    await logAuditEvent('CREATE_ADMIN', admin.id, null, {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
    });

    return NextResponse.json(
      {
        email: newAdmin.email,
        id: newAdmin.id,
        role: newAdmin.role,
        tempPassword,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
