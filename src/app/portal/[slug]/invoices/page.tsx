import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PortalInvoicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({ where: { slug } });
  if (!workspace) redirect('/app');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  const contact = user?.email
    ? await prisma.contact.findFirst({
        where: { workspaceId: workspace.id, email: user.email },
      })
    : null;

  const invoices = contact
    ? await prisma.invoice.findMany({
        where: {
          workspaceId: workspace.id,
          contactId: contact.id,
        },
        orderBy: { issueDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          total: true,
          issueDate: true,
          dueDate: true,
          publicKey: true,
        },
      })
    : [];

  const statusStyle: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    PAID: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>

      {invoices.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No invoices yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Issued</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Due</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {invoices.map((inv) => (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" key={inv.id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[inv.status] ?? ''}`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    ${inv.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(inv.issueDate), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      href={`/invoice/${inv.publicKey}`}
                      target="_blank"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
