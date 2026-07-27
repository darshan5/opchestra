import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const data = event.data.object as unknown as Record<string, unknown>;

    switch (event.type) {
      case 'checkout.session.completed': {
        const workspaceId = (data.metadata as Record<string, string>)?.workspaceId;
        const subscriptionId = data.subscription as string;
        if (workspaceId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = (subscription as unknown as Record<string, number>).current_period_end;
          await prisma.workspace.update({
            where: { id: workspaceId },
            data: {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
              seatLimit: 50,
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subId = data.id as string;
        const workspace = await prisma.workspace.findFirst({
          where: { stripeSubscriptionId: subId },
        });
        if (workspace) {
          const periodEnd = data.current_period_end as number;
          await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
              subscriptionStatus: data.status as string,
              currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subId = data.id as string;
        const workspace = await prisma.workspace.findFirst({
          where: { stripeSubscriptionId: subId },
        });
        if (workspace) {
          await prisma.workspace.update({
            where: { id: workspace.id },
            data: {
              subscriptionStatus: 'cancelled',
              stripeSubscriptionId: null,
              seatLimit: 3,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const subId = data.subscription as string;
        if (subId) {
          const workspace = await prisma.workspace.findFirst({
            where: { stripeSubscriptionId: subId },
          });
          if (workspace) {
            await prisma.workspace.update({
              where: { id: workspace.id },
              data: { subscriptionStatus: 'past_due' },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
