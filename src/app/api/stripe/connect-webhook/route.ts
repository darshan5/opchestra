import { SubscriptionStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.text();

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const obj = event.data?.object ?? {};

  switch (event.type) {
    case 'invoice.paid': {
      const paymentIntentId = obj.payment_intent as string | undefined;
      if (paymentIntentId) {
        await prisma.invoice.updateMany({
          where: { stripePaymentIntentId: paymentIntentId },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const stripeSubId = obj.id as string | undefined;
      const stripeStatus = obj.status as string | undefined;
      if (stripeSubId) {
        const statusMap: Record<string, SubscriptionStatus> = {
          active: 'ACTIVE',
          past_due: 'PAST_DUE',
          paused: 'PAUSED',
          canceled: 'CANCELED',
          unpaid: 'PAST_DUE',
        };
        const mappedStatus: SubscriptionStatus = statusMap[stripeStatus ?? ''] ?? 'ACTIVE';

        const cancelAtEnd = obj.cancel_at_period_end === true;
        const periodEnd = obj.current_period_end
          ? new Date((obj.current_period_end as number) * 1000)
          : undefined;

        const finalStatus: SubscriptionStatus =
          cancelAtEnd && mappedStatus === 'ACTIVE' ? 'PENDING_CANCEL' : mappedStatus;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSubId },
          data: {
            status: finalStatus,
            cancelAtPeriodEnd: cancelAtEnd,
            ...(periodEnd ? { currentPeriodEnd: periodEnd } : {}),
          },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSubId = obj.id as string | undefined;
      if (stripeSubId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSubId },
          data: { status: 'CANCELED' },
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
