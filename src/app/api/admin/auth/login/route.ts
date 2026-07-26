import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createAdminToken, getAdminCookieConfig } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email: parsed.data.email },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = createAdminToken({
      email: admin.email,
      id: admin.id,
      name: admin.name,
      role: admin.role,
    });

    const cookieConfig = getAdminCookieConfig();
    const cookieStore = await cookies();
    cookieStore.set(cookieConfig.name, token, {
      httpOnly: cookieConfig.httpOnly,
      maxAge: cookieConfig.maxAge,
      path: cookieConfig.path,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure,
    });

    return NextResponse.json({
      mustChangePassword: admin.mustChangePassword,
      redirect: admin.mustChangePassword ? '/admin/change-password' : '/admin',
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
