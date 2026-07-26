import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'users.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: Record<string, unknown> = { role: 'SUPER_ADMIN' };
    if (search) {
      where.OR = [
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
      delete where.role;
      where.AND = [
        { role: 'SUPER_ADMIN' },
        {
          OR: [
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const subscribers = await prisma.workspaceMember.findMany({
      where,
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { members: true, tasks: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(subscribers);
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
