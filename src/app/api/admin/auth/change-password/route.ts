import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both fields are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const adminUser = await prisma.adminUser.findUnique({ where: { id: admin.id } });
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, adminUser.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash, mustChangePassword: false },
    });

    return NextResponse.json({ message: 'Password changed' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
