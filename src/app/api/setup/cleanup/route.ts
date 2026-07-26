import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const keepSlug = 'opchestra-hq';

    const keepWorkspace = await prisma.workspace.findUnique({ where: { slug: keepSlug } });
    if (!keepWorkspace) {
      return NextResponse.json({ error: 'opchestra-hq workspace not found' }, { status: 404 });
    }

    const allWorkspaces = await prisma.workspace.findMany({
      where: { slug: { not: keepSlug } },
      select: { id: true, name: true, slug: true },
    });

    let wsDeleted = 0;
    let usersDeleted = 0;

    for (const ws of allWorkspaces) {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: ws.id },
        select: { userId: true },
      });

      await prisma.workspace.delete({ where: { id: ws.id } });
      wsDeleted++;

      for (const m of members) {
        const remaining = await prisma.workspaceMember.count({ where: { userId: m.userId } });
        if (remaining === 0) {
          await prisma.supportTicket.deleteMany({ where: { userId: m.userId } });
          await prisma.verificationToken.deleteMany({ where: { userId: m.userId } });
          await prisma.passwordResetToken.deleteMany({ where: { userId: m.userId } });
          try {
            await prisma.user.delete({ where: { id: m.userId } });
            usersDeleted++;
          } catch {
            // user may still be referenced somewhere — skip
          }
        }
      }
    }

    // Also clean up users with zero workspace memberships (except main admin)
    const orphanedUsers = await prisma.user.findMany({
      where: {
        memberships: { none: {} },
        email: { not: 'darshanpatel@gmail.com' },
      },
      select: { id: true, email: true },
    });

    for (const u of orphanedUsers) {
      try {
        await prisma.supportTicket.deleteMany({ where: { userId: u.id } });
        await prisma.verificationToken.deleteMany({ where: { userId: u.id } });
        await prisma.passwordResetToken.deleteMany({ where: { userId: u.id } });
        await prisma.user.delete({ where: { id: u.id } });
        usersDeleted++;
      } catch {
        // skip if still referenced
      }
    }

    const remainingWorkspaces = await prisma.workspace.count();
    const remainingUsers = await prisma.user.count();

    return NextResponse.json({
      message: `Cleanup complete. Deleted ${wsDeleted} workspaces, ${usersDeleted} orphaned users.`,
      remaining: { users: remainingUsers, workspaces: remainingWorkspaces },
      usersDeleted,
      workspacesDeleted: wsDeleted,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e).substring(0, 500) }, { status: 500 });
  }
}
