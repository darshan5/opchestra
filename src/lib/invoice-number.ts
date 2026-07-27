import { prisma } from '@/lib/db';

export async function generateInvoiceNumber(workspaceId: string): Promise<string> {
  const lastInvoice = await prisma.invoice.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  let nextNum = 1;
  if (lastInvoice?.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  return `INV-${String(nextNum).padStart(3, '0')}`;
}
