import { formatDistanceToNow } from 'date-fns';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PortalTicketsPage({
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

  const tickets = contact
    ? await prisma.task.findMany({
        where: {
          workspaceId: workspace.id,
          contactId: contact.id,
          ticketNumber: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          ticketNumber: true,
          status: true,
          priority: true,
          createdAt: true,
          completedAt: true,
        },
      })
    : [];

  const statusColor: Record<string, string> = {
    'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    'Waiting on Customer': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    'Resolved': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    'Closed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets</h1>
        <Link
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          href={`/portal/${slug}/tickets/new`}
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No tickets yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ticket</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Subject</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {tickets.map((ticket) => (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" key={ticket.id}>
                  <td className="px-4 py-3">
                    <Link className="font-mono text-xs text-blue-600 hover:underline dark:text-blue-400" href={`/portal/${slug}/tickets/${ticket.id}`}>
                      {ticket.ticketNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400" href={`/portal/${slug}/tickets/${ticket.id}`}>
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[ticket.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}
                    >
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
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
