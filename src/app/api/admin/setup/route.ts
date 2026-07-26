import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';

const setupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/),
});

export async function POST(request: Request) {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { isSaasAdmin: true },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'SaaS admin already exists. Use the admin panel to manage admins.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = setupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const admin = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email: parsed.data.email } });

      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { isSaasAdmin: true, emailVerified: user.emailVerified ?? new Date() },
        });
      } else {
        user = await tx.user.create({
          data: {
            email: parsed.data.email,
            name: parsed.data.name,
            passwordHash,
            isSaasAdmin: true,
            emailVerified: new Date(),
          },
        });
      }

      await tx.platformSettings.upsert({
        where: { id: 'platform' },
        create: { id: 'platform' },
        update: {},
      });

      return user;
    });

    return NextResponse.json({
      email: admin.email,
      message: 'SaaS admin created. Login at /login, then access /admin.',
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET() {
  const existingAdmin = await prisma.user.findFirst({
    where: { isSaasAdmin: true },
    select: { email: true },
  });

  return NextResponse.json({
    hasAdmin: !!existingAdmin,
    adminEmail: existingAdmin?.email ?? null,
  });
}
