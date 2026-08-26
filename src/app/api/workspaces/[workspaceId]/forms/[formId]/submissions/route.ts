import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; formId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workspaceId, formId } = await params;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });
  if (!membership || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const form = await prisma.formTemplate.findFirst({
    where: { id: formId, workspaceId },
    select: { id: true },
  });
  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  const submissions = await prisma.formSubmission.findMany({
    where: { formId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(submissions);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; formId: string }> },
) {
  const { workspaceId, formId } = await params;

  const form = await prisma.formTemplate.findFirst({
    where: { id: formId, workspaceId },
    select: { id: true, published: true },
  });
  if (!form) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  if (!form.published) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Form is not published' }, { status: 403 });
    }
  }

  const body = await req.json();

  const submission = await prisma.formSubmission.create({
    data: {
      formId,
      clientId: body.clientId ?? null,
      orderId: body.orderId ?? null,
      data: body.data ?? {},
      completed: body.completed ?? false,
    },
  });

  return NextResponse.json(submission, { status: 201 });
}
