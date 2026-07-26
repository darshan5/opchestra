import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'workspaces.read')) {
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
