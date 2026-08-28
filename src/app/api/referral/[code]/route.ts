import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const affiliate = await prisma.affiliate.findUnique({
    where: { code },
    include: {
      program: {
        include: {
          workspace: { select: { slug: true, name: true } },
        },
      },
    },
  });

  if (!affiliate || !affiliate.approved) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  await prisma.affiliateClick.create({
    data: {
      affiliateId: affiliate.id,
      ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null,
      referrer: req.headers.get('referer') ?? null,
      userAgent: req.headers.get('user-agent') ?? null,
    },
  });

  const redirectUrl = affiliate.program.redirectUrl;
  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.json({
    workspace: affiliate.program.workspace.slug,
    workspaceName: affiliate.program.workspace.name,
    affiliateCode: affiliate.code,
  });
}
