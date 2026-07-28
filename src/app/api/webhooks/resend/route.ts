import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (type !== 'email.received') {
      return NextResponse.json({ ok: true });
    }

    const { to, from, subject, text, html } = data ?? {};
    if (!to || !from) {
      return NextResponse.json({ error: 'Missing to/from' }, { status: 400 });
    }

    const platformSettings = await prisma.platformSettings.findUnique({
      where: { id: 'platform' },
      select: { inboundEmailDomain: true },
    });
    const domain = platformSettings?.inboundEmailDomain ?? 'ticket.opchestra.com';

    const recipients: string[] = Array.isArray(to) ? to : [to];
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
      let company = senderDomain
        ? await prisma.company.findFirst({
            where: { workspaceId: workspace.id, domain: senderDomain },
          })
        : null;

      if (!company && senderDomain) {
        company = await prisma.company.create({
          data: { workspaceId: workspace.id, name: senderDomain, domain: senderDomain },
        });
      }

      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          email: senderEmail,
          name: senderEmail.split('@')[0],
          companyId: company?.id ?? null,
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

    const descriptionText = text || html || '';

    const ticket = await prisma.task.create({
      data: {
        workspaceId: workspace.id,
        createdById: admin.userId,
        title: subject || 'No subject',
        description: { type: 'text', text: descriptionText },
        ticketNumber,
        source: 'email',
        contactId: contact.id,
        companyId: contact.companyId,
        status: 'Open',
        priority: 'MEDIUM',
      },
    });

    return NextResponse.json({ ticketId: ticket.id, ticketNumber });
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
