import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { generateTicketNumber } from '@/lib/ticket-number';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceSlug: string }> },
) {
  try {
    const { workspaceSlug } = await params;
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true, name: true },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, email, subject, description, priority } = body;

    if (!name || !email || !subject) {
      return NextResponse.json(
        { error: 'Name, email, and subject are required' },
        { status: 400 },
      );
    }

    let contact = await prisma.contact.findFirst({
      where: { workspaceId: workspace.id, email },
    });

    if (!contact) {
      const domain = email.split('@')[1];
      let company = await prisma.company.findFirst({
        where: { workspaceId: workspace.id, domain },
      });

      if (!company && domain) {
        company = await prisma.company.create({
          data: {
            workspaceId: workspace.id,
            name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
            domain,
          },
        });
      }

      contact = await prisma.contact.create({
        data: {
          workspaceId: workspace.id,
          name,
          email,
          companyId: company?.id,
        },
      });
    }

    const firstAdmin = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspace.id, role: 'SUPER_ADMIN' },
      select: { userId: true },
    });

    if (!firstAdmin) {
      return NextResponse.json({ error: 'Workspace has no admin' }, { status: 500 });
    }

    const ticketNumber = await generateTicketNumber(workspace.id);

    const slaRule = await prisma.slaRule.findUnique({
      where: {
        workspaceId_priority: {
          workspaceId: workspace.id,
          priority: priority || 'MEDIUM',
        },
      },
    });

    const now = new Date();

    const ticket = await prisma.task.create({
      data: {
        workspaceId: workspace.id,
        createdById: firstAdmin.userId,
        title: subject,
        description: description ? { type: 'text', text: description } : undefined,
        status: 'Open',
        priority: priority || 'MEDIUM',
        source: 'Form',
        ticketNumber,
        contactId: contact.id,
        companyId: contact.companyId,
        slaResponseDue: slaRule
          ? new Date(now.getTime() + slaRule.responseTime * 60000)
          : null,
        slaResolutionDue: slaRule
          ? new Date(now.getTime() + slaRule.resolutionTime * 60000)
          : null,
      },
    });

    return NextResponse.json(
      { message: 'Ticket submitted', ticketNumber: ticket.ticketNumber },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
