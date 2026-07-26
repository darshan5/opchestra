import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';

export async function logAuditEvent(
  action: string,
  adminUserId: string | null,
  targetUserId: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string | null,
) {
  await prisma.auditLog.create({
    data: {
      action,
      adminUserId,
      targetUserId,
      details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: ipAddress ?? undefined,
    },
  });
}
