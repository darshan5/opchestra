import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { to } = await request.json();
    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const settings = await prisma.platformSettings.findUnique({
      where: { id: 'platform' },
      select: { emailApiKey: true, emailFromAddress: true, emailFromName: true },
    });

    if (!settings?.emailApiKey) {
      return NextResponse.json({ error: 'Email API key not configured' }, { status: 400 });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(settings.emailApiKey);

    const result = await resend.emails.send({
      from: `${settings.emailFromName} <${settings.emailFromAddress}>`,
      to,
      subject: 'Test Email from Opchestra',
      html: '<h2>Test Email</h2><p>This is a test email from the Opchestra admin panel.</p><p>If you received this, email delivery is working correctly.</p>',
    });

    return NextResponse.json({ message: 'Test email sent', messageId: result.data?.id });
  } catch (e) {
    return NextResponse.json({ error: `Failed: ${String(e)}` }, { status: 500 });
  }
}
