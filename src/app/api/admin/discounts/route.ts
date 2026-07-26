import { NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const discounts = await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(discounts);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const discount = await prisma.discountCode.create({
      data: {
        code: body.code.toUpperCase().trim(),
        description: body.description || null,
        type: body.type || 'LIFETIME',
        percentOff: body.percentOff,
        billingScope: body.billingScope || 'BOTH',
        maxUses: body.maxUses || null,
        isActive: body.isActive ?? true,
        startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    await logAuditEvent('CREATE_DISCOUNT', admin.id, null, { code: discount.code });

    return NextResponse.json(discount, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
