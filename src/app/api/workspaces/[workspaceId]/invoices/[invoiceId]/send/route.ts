import { NextResponse } from 'next/server';
import { Resend } from 'resend';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; invoiceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, invoiceId } = await params;

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        workspace: { select: { name: true } },
        contact: { select: { email: true, name: true } },
        company: { select: { name: true } },
      },
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const recipientEmail = invoice.contact?.email;
    if (!recipientEmail) {
      return NextResponse.json({ error: 'No contact email to send to' }, { status: 400 });
    }

    const publicUrl = `${process.env.NEXTAUTH_URL || 'https://opchestra.com'}/invoice/${invoice.publicKey}`;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_ADDRESS || 'Opchestra <noreply@opchestra.com>',
        subject: `Invoice ${invoice.invoiceNumber} from ${invoice.workspace.name}`,
        to: recipientEmail,
        html: `
          <h2>Invoice ${invoice.invoiceNumber}</h2>
          <p>From: <strong>${invoice.workspace.name}</strong></p>
          <p>Amount: <strong>$${invoice.total.toFixed(2)}</strong></p>
          ${invoice.dueDate ? `<p>Due: ${new Date(invoice.dueDate).toLocaleDateString()}</p>` : ''}
          <p><a href="${publicUrl}">View Invoice</a></p>
        `,
      });
    } else {
      // eslint-disable-next-line no-console
      console.log(`[DEV] Invoice email to ${recipientEmail}: ${publicUrl}`);
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    return NextResponse.json({ message: 'Invoice sent', publicUrl });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
