import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name } = await request.json();

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { name: name || null },
    });

    return NextResponse.json({ message: 'Profile updated' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
