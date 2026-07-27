import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const { workspaceId } = await request.json();

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace?.stripeCustomerId) {
      return NextResponse.json({ error: 'No billing setup' }, { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/app/${workspace.slug}/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
