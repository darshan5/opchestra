import crypto from 'crypto';

import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { createWorkspaceSchema } from '@/lib/auth/validation';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, inboundEmailKey: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      })),
    );
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await prisma.workspace.findUnique({
      where: { slug: parsed.data.slug },
    });

    if (existing) {
      return NextResponse.json({ error: 'This URL is already taken' }, { status: 409 });
    }

    const workspace = await prisma.$transaction(async (tx) => {
      const inboundEmailKey = crypto.randomBytes(8).toString('base64url').substring(0, 12);
      const ws = await tx.workspace.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          inboundEmailKey,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId: session.user.id,
          role: 'SUPER_ADMIN',
        },
      });

      await tx.statusWorkflow.create({
        data: {
          workspaceId: ws.id,
          name: 'Default Task Workflow',
          isDefault: true,
          statuses: [
            { name: 'Todo', color: '#6B7280', category: 'todo' },
            { name: 'In Progress', color: '#3B82F6', category: 'in_progress' },
            { name: 'Done', color: '#10B981', category: 'done' },
          ],
        },
      });

      await tx.workspaceSettings.create({
        data: { workspaceId: ws.id },
      });

      return ws;
    });

    return NextResponse.json({ id: workspace.id, slug: workspace.slug }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
