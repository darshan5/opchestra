import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function PortalServicesPage({
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

  const primaryColor = workspace.portalSettings?.primaryColor ?? '#6366f1';

  const services = await prisma.service.findMany({
    where: { workspaceId: workspace.id, published: true },
    include: {
      category: { select: { name: true } },
      variants: { orderBy: { position: 'asc' }, select: { id: true, name: true, price: true } },
    },
    orderBy: { position: 'asc' },
  });

  const categories = [...new Set(services.map((s) => s.category?.name).filter(Boolean))] as string[];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Browse available services.
      </p>

      {services.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No services available yet.</p>
        </div>
      ) : (
        <>
          {categories.length > 1 && (
            <div className="mt-4 flex gap-2">
              {categories.map((cat) => (
                <span
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-400"
                  key={cat}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
                key={service.id}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{service.name}</h3>
                    {service.category && (
                      <p className="mt-0.5 text-xs text-gray-400">{service.category.name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      ${service.price.toFixed(2)}
                    </p>
                    {service.pricingType === 'RECURRING' && service.recurringInterval && (
                      <p className="text-xs text-gray-500">
                        /{service.recurringInterval.toLowerCase()}
                      </p>
                    )}
                  </div>
                </div>

                {service.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                    {service.description}
                  </p>
                )}

                {service.variants.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {service.variants.map((v) => (
                      <span
                        className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        key={v.id}
                      >
                        {v.name} — ${v.price.toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}

                {service.setupFee ? (
                  <p className="mt-2 text-xs text-gray-400">
                    + ${service.setupFee.toFixed(2)} setup fee
                  </p>
                ) : null}

                <a
                  className="mt-4 block rounded-lg py-2 text-center text-sm font-medium text-white transition-colors hover:opacity-90"
                  href={`/checkout/${slug}/${service.id}`}
                  style={{ backgroundColor: primaryColor }}
                >
                  {service.pricingType === 'RECURRING' ? 'Subscribe' : 'Order Now'}
                </a>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
