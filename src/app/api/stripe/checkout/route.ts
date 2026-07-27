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

    const { priceId, workspaceId } = await request.json();

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    if (!membership || membership.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only workspace owner can manage billing' }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    let customerId = workspace.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        metadata: { workspaceId },
        name: workspace.name,
      });
      customerId = customer.id;
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { stripeCustomerId: customerId },
      });
    }

    const memberCount = await prisma.workspaceMember.count({ where: { workspaceId } });

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: memberCount }],
      metadata: { workspaceId },
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/app/${workspace.slug}/billing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/app/${workspace.slug}/billing?cancelled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
