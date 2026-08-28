import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_TEMPLATES = [
  { name: 'order_confirmation', subject: 'Order Confirmed — {{service_name}}', body: 'Hi {{client_name}},\n\nYour order for {{service_name}} has been confirmed.\n\nOrder ID: {{order_id}}\nTotal: {{total}}\n\nWe\'ll be in touch with next steps.\n\nThank you!' },
  { name: 'intake_reminder', subject: 'Action Required — Complete Your Intake Form', body: 'Hi {{client_name}},\n\nPlease complete the intake form for your order of {{service_name}}.\n\nComplete it here: {{intake_url}}\n\nThank you!' },
  { name: 'ticket_reply', subject: 'Re: [{{ticket_number}}] {{ticket_subject}}', body: '{{reply_content}}\n\n---\nThis is a reply to your support ticket {{ticket_number}}.' },
  { name: 'invoice_sent', subject: 'Invoice {{invoice_number}} from {{workspace_name}}', body: 'Hi {{client_name}},\n\nPlease find your invoice {{invoice_number}} for {{total}}.\n\nDue date: {{due_date}}\n\nView invoice: {{invoice_url}}\n\nThank you!' },
  { name: 'subscription_created', subject: 'Subscription Started — {{service_name}}', body: 'Hi {{client_name}},\n\nYour subscription to {{service_name}} is now active.\n\nBilling: {{interval}}\nNext billing date: {{next_billing_date}}\n\nThank you!' },
];

async function getManagerMembership(workspaceId: string, userId: string) {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(m.role)) return null;
  return m;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId } = await params;

  let templates = await prisma.emailTemplate.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });

  if (templates.length === 0) {
    await prisma.emailTemplate.createMany({
      data: DEFAULT_TEMPLATES.map((t) => ({
        workspaceId,
        name: t.name,
        subject: t.subject,
        body: t.body,
        variables: [],
      })),
    });
    templates = await prisma.emailTemplate.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  return NextResponse.json(templates);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId } = await params;
  if (!await getManagerMembership(workspaceId, session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { name, subject, body, variables } = await req.json();
  if (!name || !subject) return NextResponse.json({ error: 'Name and subject are required' }, { status: 400 });

  const template = await prisma.emailTemplate.create({
    data: {
      workspaceId,
      name,
      subject,
      body: body || '',
      variables: variables || [],
    },
  });

  return NextResponse.json(template, { status: 201 });
}
