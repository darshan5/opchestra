import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { isSaasAdmin } from '@/lib/auth/admin';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !(await isSaasAdmin(session.user.id))) {
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
    const session = await auth();
    if (!session?.user?.id || !(await isSaasAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const allowedFields = [
      'siteName',
      'signupEnabled',
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
