import { prisma } from '@/lib/db';

export async function generateTicketNumber(workspaceId: string): Promise<string> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ticketPrefix: true },
  });

  const prefix = workspace?.ticketPrefix ?? 'TKT';

  const lastTicket = await prisma.task.findFirst({
    where: { workspaceId, ticketNumber: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { ticketNumber: true },
  });

  let nextNum = 1;
  if (lastTicket?.ticketNumber) {
    const match = lastTicket.ticketNumber.match(/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}-${String(nextNum).padStart(3, '0')}`;
}
