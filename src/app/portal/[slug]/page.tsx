import { FileText, ShoppingBag, Ticket } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PortalDashboard({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: { portalSettings: true },
  });
  if (!workspace) redirect('/app');

  const portal = workspace.portalSettings;
  const primaryColor = portal?.primaryColor ?? '#6366f1';

  const [openTickets, invoices] = await Promise.all([
    prisma.task.count({
      where: {
        workspaceId: workspace.id,
        contactId: { not: null },
        ticketNumber: { not: null },
        completedAt: null,
      },
    }),
    prisma.invoice.count({
      where: {
        workspaceId: workspace.id,
        status: { in: ['SENT', 'OVERDUE'] },
      },
    }),
  ]);

  const cards = [
    {
      count: 0,
      href: `${slug}/orders`,
      icon: ShoppingBag,
      label: 'Active Orders',
    },
    {
      count: openTickets,
      href: `${slug}/tickets`,
      icon: Ticket,
      label: 'Open Tickets',
    },
    {
      count: invoices,
      href: `${slug}/invoices`,
      icon: FileText,
      label: 'Pending Invoices',
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {portal?.welcomeMessage ?? `Welcome back, ${session.user.name ?? 'there'}`}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Here&apos;s an overview of your account.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
            href={`/portal/${card.href}`}
            key={card.label}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.count}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
