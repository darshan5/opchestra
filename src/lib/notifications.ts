import { prisma } from '@/lib/db';

type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_UNASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_COMMENTED'
  | 'TASK_MENTIONED'
  | 'TASK_DUE_SOON';

export async function createNotification(
  workspaceId: string,
  userId: string,
  type: NotificationType,
  title: string,
  message?: string,
  data?: Record<string, unknown>,
) {
  try {
    await prisma.notification.create({
      data: {
        workspaceId,
        userId,
        type,
        title,
        message,
        data: data ? (data as object) : undefined,
      },
    });
  } catch {
    // don't fail the parent operation if notification creation fails
  }
}
