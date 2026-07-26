import { NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/audit';
import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await prisma.platformSettings.findUnique({
      where: { id: 'platform' },
    });

    if (!settings) {
      return NextResponse.json({ error: 'Platform not initialized' }, { status: 404 });
    }

    return NextResponse.json({
      ...settings,
      emailApiKey: settings.emailApiKey ? '••••••••' : null,
      r2AccessKeyId: settings.r2AccessKeyId ? '••••••••' : null,
      r2SecretAccessKey: settings.r2SecretAccessKey ? '••••••••' : null,
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const allowedFields = [
      'siteName',
      'signupEnabled',
      'maintenanceMode',
      'maintenanceWhitelistDomains',
      'disableLogin',
      'emailProvider',
      'emailApiKey',
      'emailFromAddress',
      'emailFromName',
      'r2AccountId',
      'r2AccessKeyId',
      'r2SecretAccessKey',
      'r2BucketName',
      'r2PublicUrl',
      'maxFreeUsers',
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const settings = await prisma.platformSettings.update({
      where: { id: 'platform' },
      data,
    });

    const changedKeys = Object.keys(data).filter(
      (k) => !k.toLowerCase().includes('key') && !k.toLowerCase().includes('secret'),
    );
    await logAuditEvent('UPDATE_SETTINGS', admin.id, null, { changed: changedKeys });

    return NextResponse.json({
      ...settings,
      emailApiKey: settings.emailApiKey ? '••••••••' : null,
      r2AccessKeyId: settings.r2AccessKeyId ? '••••••••' : null,
      r2SecretAccessKey: settings.r2SecretAccessKey ? '••••••••' : null,
    });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
