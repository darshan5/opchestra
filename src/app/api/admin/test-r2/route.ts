import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'settings.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await prisma.platformSettings.findUnique({
      where: { id: 'platform' },
      select: { r2AccountId: true, r2AccessKeyId: true, r2SecretAccessKey: true, r2BucketName: true },
    });

    if (!settings?.r2AccessKeyId || !settings?.r2SecretAccessKey || !settings?.r2AccountId) {
      return NextResponse.json({ error: 'R2 credentials not configured' }, { status: 400 });
    }

    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${settings.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: settings.r2AccessKeyId,
        secretAccessKey: settings.r2SecretAccessKey,
      },
    });

    const result = await client.send(
      new ListObjectsV2Command({ Bucket: settings.r2BucketName, MaxKeys: 1 }),
    );

    return NextResponse.json({
      bucket: settings.r2BucketName,
      message: 'R2 connection successful',
      objects: result.KeyCount ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ error: `R2 connection failed: ${String(e).substring(0, 150)}` }, { status: 500 });
  }
}
