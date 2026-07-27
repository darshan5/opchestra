import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { planId } = await params;
    const body = await request.json();

    const plan = await prisma.plan.update({
      where: { id: planId },
      data: body,
    });

    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { planId } = await params;
    await prisma.plan.delete({ where: { id: planId } });

    return NextResponse.json({ message: 'Plan deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
