import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getManagerMembership(workspaceId: string, userId: string) {
  const m = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!m || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(m.role)) return null;
  return m;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; templateId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId, templateId } = await params;

  const template = await prisma.emailTemplate.findFirst({
    where: { id: templateId, workspaceId },
  });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(template);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; templateId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId, templateId } = await params;
  if (!await getManagerMembership(workspaceId, session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ['name', 'subject', 'body', 'variables'] as const) {
    if (key in body) data[key] = body[key];
  }

  const template = await prisma.emailTemplate.update({
    where: { id: templateId },
    data,
  });

  return NextResponse.json(template);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; templateId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { workspaceId, templateId } = await params;
  if (!await getManagerMembership(workspaceId, session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.emailTemplate.delete({ where: { id: templateId } });

  return NextResponse.json({ ok: true });
}
