import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const createFieldSchema = z.object({
  config: z.any().optional(),
  name: z.string().min(1).max(100),
  type: z.string().min(1),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fields = await prisma.customFieldDefinition.findMany({
      where: { workspaceId },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(fields);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await params;
    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const count = await prisma.customFieldDefinition.count({ where: { workspaceId } });
    if (count >= 50) {
      return NextResponse.json({ error: 'Maximum custom fields reached (50)' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = createFieldSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const field = await prisma.customFieldDefinition.create({
      data: {
        workspaceId,
        name: parsed.data.name,
        type: parsed.data.type,
        config: parsed.data.config ?? {},
        position: count,
      },
    });

    return NextResponse.json(field, { status: 201 });
  } catch (e) {
    const msg = String(e);
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A field with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
