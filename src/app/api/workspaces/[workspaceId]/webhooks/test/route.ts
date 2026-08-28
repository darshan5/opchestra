import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getAdminMembership(workspaceId: string, userId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN'].includes(membership.role)) {
    return null;
  }
  return membership;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getAdminMembership(workspaceId, session.user.id);
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { webhookId, event } = await req.json();

  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, workspaceId },
  });

  if (!endpoint) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const payload = {
    event: event || 'test.ping',
    data: { message: 'This is a test webhook delivery', timestamp: new Date().toISOString() },
  };

  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', endpoint.secret)
    .update(payloadStr)
    .digest('hex');

  let statusCode: number | null = null;
  let response: string | null = null;

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event || 'test.ping',
      },
      body: payloadStr,
      signal: AbortSignal.timeout(10000),
    });
    statusCode = res.status;
    response = await res.text().catch(() => null);
  } catch (err) {
    response = err instanceof Error ? err.message : 'Request failed';
  }

  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId: endpoint.id,
      event: event || 'test.ping',
      payload,
      statusCode,
      response: response?.slice(0, 1000) ?? null,
      attempts: 1,
      deliveredAt: statusCode && statusCode >= 200 && statusCode < 300 ? new Date() : null,
    },
  });

  await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: { lastCalledAt: new Date(), lastStatus: statusCode },
  });

  return NextResponse.json({
    deliveryId: delivery.id,
    statusCode,
    success: statusCode !== null && statusCode >= 200 && statusCode < 300,
  });
}
