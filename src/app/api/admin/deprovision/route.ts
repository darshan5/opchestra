import { NextResponse } from 'next/server';

import { hasPermission } from '@/lib/auth/admin-permissions';
import { getAdminSession } from '@/lib/auth/admin-session';
import { logAuditEvent } from '@/lib/audit';
import { prisma } from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin || !hasPermission(admin.role, 'users.write')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { workspaceId } = await request.json();

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const memberUserIds = workspace.members.map((m) => m.user.id);
    const workspaceName = workspace.name;

    let usersDeleted = 0;
    let usersKept = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Delete the workspace — CASCADE removes: tasks, projects, labels, views,
      //    comments, time entries, files, notifications, status workflows,
      //    workspace settings, invite tokens, workspace members
      await tx.workspace.delete({ where: { id: workspaceId } });

      // 2. For each former member, check if they're orphaned
      for (const userId of memberUserIds) {
        const otherMemberships = await tx.workspaceMember.count({
          where: { userId },
        });

        if (otherMemberships === 0) {
          // Orphaned user — clean up their non-cascaded data, then delete
          await tx.supportTicket.deleteMany({ where: { userId } });
          await tx.verificationToken.deleteMany({ where: { userId } });
          await tx.passwordResetToken.deleteMany({ where: { userId } });
          // AuditLog.targetUserId uses onDelete: SetNull, so it's safe
          await tx.user.delete({ where: { id: userId } });
          usersDeleted++;
        } else {
          usersKept++;
        }
      }
    });

    await logAuditEvent('DELETE_SUBSCRIBER', admin.id, null, {
      workspaceName,
      workspaceId,
      usersDeleted,
      usersKept,
      totalMembers: memberUserIds.length,
    });

    return NextResponse.json({
      message: `Workspace "${workspaceName}" deleted. ${usersDeleted} users removed, ${usersKept} users kept.`,
      usersDeleted,
      usersKept,
      workspaceName,
    });
  } catch (e) {
    const msg = String(e);
    if (msg.includes('Foreign key constraint')) {
      return NextResponse.json(
        {
          error:
            'Cannot delete: some users have data in other workspaces that references them. Try removing those references first.',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
