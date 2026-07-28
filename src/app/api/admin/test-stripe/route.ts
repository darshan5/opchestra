import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';

export async function POST() {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set in environment' }, { status: 400 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const products = await stripe.products.list({ limit: 1 });

    return NextResponse.json({
      message: 'Stripe connection successful',
      productsFound: products.data.length,
    });
  } catch (e) {
    return NextResponse.json({ error: `Stripe connection failed: ${String(e).substring(0, 150)}` }, { status: 500 });
  }
}
