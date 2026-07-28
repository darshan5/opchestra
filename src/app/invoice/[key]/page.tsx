import { format } from 'date-fns';
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/db';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  CANCELLED: 'bg-gray-100 text-gray-700',
  DRAFT: 'bg-gray-100 text-gray-700',
  OVERDUE: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-700',
  SENT: 'bg-blue-100 text-blue-700',
};

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { publicKey: key },
    include: {
      workspace: { select: { name: true } },
      company: { select: { name: true, domain: true } },
      contact: { select: { name: true, email: true, phone: true } },
      items: { orderBy: { position: 'asc' } },
    },
  });

  if (!invoice) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl p-8 print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
          <span
            className={cn(
              'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
              statusColors[invoice.status],
            )}
          >
            {invoice.status}
          </span>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-gray-900">{invoice.workspace.name}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bill To</p>
          {invoice.company && (
            <p className="mt-1 text-sm font-semibold text-gray-900">{invoice.company.name}</p>
          )}
          {invoice.contact && (
            <>
              <p className="text-sm text-gray-700">{invoice.contact.name}</p>
              <p className="text-sm text-gray-500">{invoice.contact.email}</p>
            </>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            Issue Date: {format(new Date(invoice.issueDate), 'MMM d, yyyy')}
          </p>
          {invoice.dueDate && (
            <p className="text-sm text-gray-500">
              Due Date: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>

      <table className="mt-8 w-full">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Description
            </th>
            <th className="w-20 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
              Qty
            </th>
            <th className="w-24 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
              Rate
            </th>
            <th className="w-24 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => {
            const isSection = item.isSection;
            const isSubItem = item.isSubItem;
            const isTaskHeader = !isSection && !isSubItem && item.quantity === 0 && item.rate === 0 && item.amount === 0;
            const isHeaderLike = isSection || isTaskHeader;
            return (
              <tr
                className={cn(
                  'border-b border-gray-100',
                  isSection && 'bg-blue-50',
                  isTaskHeader && 'bg-gray-50',
                )}
                key={item.id}
              >
                <td className="px-4 py-2 text-sm text-gray-900">
                  <span className={cn(
                    isSection && 'font-bold text-blue-700',
                    isTaskHeader && 'font-semibold',
                    isSubItem && 'ml-6 text-gray-600',
                  )}>
                    {isSubItem && <span className="mr-1 text-gray-400">·</span>}
                    {item.description}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-sm text-gray-700">
                  {isHeaderLike ? '' : item.quantity}
                </td>
                <td className="px-4 py-2 text-right text-sm text-gray-700">
                  {isHeaderLike ? '' : `$${item.rate.toFixed(2)}`}
                </td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-gray-900">
                  {isHeaderLike ? '' : `$${item.amount.toFixed(2)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-60 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900">${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tax</span>
            <span className="text-gray-900">${invoice.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-gray-900 pt-2 text-base font-bold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">${invoice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="mt-8 rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</p>
          <p className="mt-1 text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
