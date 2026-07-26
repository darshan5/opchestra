import { NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.code !== undefined) {
      data.code = body.code.toUpperCase().trim();
    }
    if (body.description !== undefined) {
      data.description = body.description || null;
    }
    if (body.type !== undefined) {
      data.type = body.type;
    }
    if (body.percentOff !== undefined) {
      data.percentOff = body.percentOff;
    }
    if (body.billingScope !== undefined) {
      data.billingScope = body.billingScope;
    }
    if (body.maxUses !== undefined) {
      data.maxUses = body.maxUses;
    }
    if (body.isActive !== undefined) {
      data.isActive = body.isActive;
    }
    if (body.startsAt !== undefined) {
      data.startsAt = new Date(body.startsAt);
    }
    if (body.expiresAt !== undefined) {
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    const discount = await prisma.discountCode.update({ where: { id }, data });

    await logAuditEvent('UPDATE_DISCOUNT', admin.id, null, {
      code: discount.code,
      changed: Object.keys(data),
    });

    return NextResponse.json(discount);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const discount = await prisma.discountCode.delete({ where: { id } });

    await logAuditEvent('DELETE_DISCOUNT', admin.id, null, { code: discount.code });

    return NextResponse.json({ message: 'Deleted' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
