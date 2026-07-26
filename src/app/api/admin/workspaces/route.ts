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

    const workspaces = await prisma.workspace.findMany({
      include: {
        _count: { select: { members: true, projects: true, tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(workspaces);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
