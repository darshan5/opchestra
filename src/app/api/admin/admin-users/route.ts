import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { logAuditEvent } from '@/lib/audit';
import { auth } from '@/lib/auth';
import { isSaasAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';

const createAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isSaasAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admins = await prisma.user.findMany({
      where: { isSaasAdmin: true },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(admins);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isSaasAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createAdminSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      if (existing.isSaasAdmin) {
        return NextResponse.json({ error: 'User is already an admin' }, { status: 409 });
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: { isSaasAdmin: true },
      });
      await logAuditEvent('PROMOTE_TO_ADMIN', session.user.id, existing.id, {
        email: parsed.data.email,
      });
      return NextResponse.json({
        id: existing.id,
        email: existing.email,
        message: 'Existing user promoted to admin',
      });
    }

    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        passwordHash,
        isSaasAdmin: true,
        emailVerified: new Date(),
        mustChangePassword: true,
      },
    });

    await logAuditEvent('CREATE_ADMIN', session.user.id, user.id, {
      email: parsed.data.email,
      name: parsed.data.name,
    });

    return NextResponse.json(
      {
        email: user.email,
        id: user.id,
        tempPassword,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
