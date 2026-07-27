import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json(plans);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const plan = await prisma.plan.create({
      data: {
        name: body.name,
        description: body.description,
        priceMonthly: body.priceMonthly ?? 0,
        priceAnnual: body.priceAnnual ?? 0,
        maxUsers: body.maxUsers ?? 3,
        stripePriceIdMonthly: body.stripePriceIdMonthly,
        stripePriceIdAnnual: body.stripePriceIdAnnual,
        features: body.features,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
