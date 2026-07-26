import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'dashboard.read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    });

    const monthlySignups: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySignups[key] = 0;
    }
    for (const u of users) {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlySignups[key] !== undefined) {
        monthlySignups[key]++;
      }
    }

    const userGrowth = Object.entries(monthlySignups).map(([month, count]) => ({
      count,
      month,
    }));

    const workspaces = await prisma.workspace.findMany({
      include: { _count: { select: { members: true } } },
    });

    const brackets: Record<string, number> = { '1': 0, '11+': 0, '2-5': 0, '6-10': 0 };
    for (const ws of workspaces) {
      const c = ws._count.members;
      if (c <= 1) {
        brackets['1']++;
      } else if (c <= 5) {
        brackets['2-5']++;
      } else if (c <= 10) {
        brackets['6-10']++;
      } else {
        brackets['11+']++;
      }
    }

    const workspaceDistribution = Object.entries(brackets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: `${name} members`, value }));

    return NextResponse.json({ userGrowth, workspaceDistribution });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
