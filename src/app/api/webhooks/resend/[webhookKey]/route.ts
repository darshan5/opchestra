import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webhookKey: string }> },
) {
  try {
    const { webhookKey } = await params;

    const platformSettings = await prisma.platformSettings.findUnique({
      where: { id: 'platform' },
      select: { inboundEmailDomain: true, resendWebhookKey: true, resendWebhookSigningSecret: true },
    });

    if (!platformSettings?.resendWebhookKey || webhookKey !== platformSettings.resendWebhookKey) {
      return NextResponse.json({ error: 'Invalid webhook key' }, { status: 403 });
    }

    const rawBody = await request.text();
    let body: Record<string, unknown>;

    if (platformSettings.resendWebhookSigningSecret) {
      const svixHeaders: Record<string, string> = {};
      request.headers.forEach((v, k) => { svixHeaders[k] = v; });

      const hasSvixHeaders = svixHeaders['svix-id'] && svixHeaders['svix-timestamp'] && svixHeaders['svix-signature'];

      if (hasSvixHeaders) {
        try {
          const secret = platformSettings.resendWebhookSigningSecret;
          const wh = new Webhook(secret);
          body = wh.verify(rawBody, svixHeaders) as Record<string, unknown>;
        } catch {
          try {
            const secret = platformSettings.resendWebhookSigningSecret.startsWith('whsec_')
              ? platformSettings.resendWebhookSigningSecret
              : `whsec_${platformSettings.resendWebhookSigningSecret}`;
            const wh = new Webhook(secret);
            body = wh.verify(rawBody, svixHeaders) as Record<string, unknown>;
          } catch {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
          }
        }
      } else {
        body = JSON.parse(rawBody);
      }
    } else {
      body = JSON.parse(rawBody);
    }

    const { type, data } = body;

    if (type !== 'email.received') {
      return NextResponse.json({ ok: true });
    }

    const eventData = data as Record<string, unknown>;
    const { to, from, subject, text, html } = eventData;
    if (!to || !from) {
      return NextResponse.json({ error: 'Missing to/from' }, { status: 400 });
    }

    const domain = platformSettings.inboundEmailDomain ?? 'ticket.opchestra.com';

    const recipients: string[] = Array.isArray(to) ? to : [to as string];
    const recipient = recipients.find((r: string) =>
      r.toLowerCase().includes(`@${domain.toLowerCase()}`),
    );

    if (!recipient) {
      return NextResponse.json({ ok: true, skipped: 'No matching domain' });
    }

    const match = recipient.match(/^support\+([a-zA-Z0-9_-]+)@/i);
    if (!match) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    const key = match[1];

    const workspace = await prisma.workspace.findUnique({
      where: { inboundEmailKey: key },
    });
    if (!workspace) {
      return NextResponse.json({ error: 'Unknown workspace key' }, { status: 404 });
    }

    const senderEmail = typeof from === 'string' ? from : (from as { address?: string })?.address ?? String(from);
    const senderDomain = senderEmail.split('@')[1] ?? '';

    let contact = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, email: senderEmail },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: senderEmail,
          name: senderEmail.split('@')[0],
        },
      });
    }

    const lastTicket = await prisma.task.findFirst({
      where: { workspaceId: workspace.id, ticketNumber: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: { ticketNumber: true },
    });

    let nextNum = 1;
    if (lastTicket?.ticketNumber) {
      const parts = lastTicket.ticketNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) {
        nextNum = num + 1;
      }
    }
    const ticketNumber = `${workspace.ticketPrefix}-${String(nextNum).padStart(3, '0')}`;

    const admin = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, role: 'SUPER_ADMIN' },
    });

    if (!admin) {
      return NextResponse.json({ error: 'No admin found for workspace' }, { status: 500 });
    }

    const emailBody = (text || html || '') as string;

    const ticket = await prisma.task.create({
      data: {
        workspaceId: workspace.id,
        createdById: admin.userId,
        title: (subject as string) || 'No subject',
        ticketNumber,
        source: 'email',
        contactId: contact.id,
        status: 'Open',
        priority: 'MEDIUM',
      },
    });

    if (emailBody.trim()) {
      await prisma.note.create({
        data: {
          workspaceId: workspace.id,
          entityType: 'ticket',
          entityId: ticket.id,
          content: emailBody,
          category: 'client_comment',
          createdById: admin.userId,
        },
      });
    }

    return NextResponse.json({ ticketId: ticket.id, ticketNumber });
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
