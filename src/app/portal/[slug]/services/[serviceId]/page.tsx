import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PortalServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; serviceId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { slug, serviceId } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: { portalSettings: true },
  });
  if (!workspace) redirect('/app');

  const primaryColor = workspace.portalSettings?.primaryColor ?? '#6366f1';

  const service = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId: workspace.id, published: true },
    include: {
      category: { select: { name: true } },
      variants: { orderBy: { position: 'asc' } },
    },
  });

  if (!service) notFound();

  return (
    <div className="p-6">
      <Link
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        href={`/portal/${slug}/services`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Services
      </Link>

      <div className="mt-6 mx-auto max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{service.name}</h1>
              {service.category && (
                <p className="mt-1 text-sm text-gray-400">{service.category.name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${service.price.toFixed(2)}
              </p>
              {service.pricingType === 'RECURRING' && service.recurringInterval && (
                <p className="text-sm text-gray-500">/{service.recurringInterval.toLowerCase()}</p>
              )}
              {service.pricingType === 'ONE_TIME' && (
                <p className="text-sm text-gray-500">one-time</p>
              )}
            </div>
          </div>

          {service.description && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{service.description}</p>
          )}

          {service.setupFee ? (
            <p className="mt-2 text-sm text-gray-500">
              Setup fee: ${service.setupFee.toFixed(2)}
            </p>
          ) : null}

          {service.deadline ? (
            <p className="mt-1 text-sm text-gray-500">
              Delivery: {service.deadline} business day{service.deadline > 1 ? 's' : ''}
            </p>
          ) : null}

          {service.trialDays ? (
            <p className="mt-1 text-sm text-gray-500">
              {service.trialDays}-day free trial
            </p>
          ) : null}

          {service.variants.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Options</h2>
              <div className="mt-2 space-y-2">
                {service.variants.map((v) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700"
                    key={v.id}
                  >
                    <span className="text-sm text-gray-900 dark:text-white">{v.name}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${v.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <a
            className="mt-6 block rounded-lg py-3 text-center text-sm font-medium text-white transition-colors hover:opacity-90"
            href={`/checkout/${slug}/${service.id}`}
            style={{ backgroundColor: primaryColor }}
          >
            {service.pricingType === 'RECURRING' ? 'Subscribe' : 'Order Now'}
          </a>
        </div>
      </div>
    </div>
  );
}
