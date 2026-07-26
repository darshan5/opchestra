import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

export async function logAuditEvent(
  action: string,
  adminUserId: string | null,
  targetUserId: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string | null,
) {
  let adminUserEmail: string | undefined;
  if (adminUserId) {
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminUserId },
      select: { email: true },
    });
    adminUserEmail = admin?.email ?? undefined;
  }

  await prisma.auditLog.create({
    data: {
      action,
      adminUserId,
      adminUserEmail,
      targetUserId,
      details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: ipAddress ?? undefined,
    },
  });
}
