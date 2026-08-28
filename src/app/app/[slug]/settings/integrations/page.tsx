'use client';

import { Code, Key, Webhook, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function IntegrationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const base = `/app/${slug}`;

  const integrations = [
    {
      name: 'API Keys',
      description: 'Generate API keys to access workspace data programmatically via the REST API.',
      icon: Key,
      href: `${base}/settings/api`,
      status: 'Available',
    },
    {
      name: 'Webhooks',
      description: 'Receive real-time notifications when events happen in your workspace.',
      icon: Webhook,
      href: `${base}/settings/api`,
      status: 'Available',
    },
    {
      name: 'REST API (v1)',
      description: 'Full CRUD access to clients, orders, services, invoices, tickets, and subscriptions.',
      icon: Code,
      href: `${base}/settings/api`,
      status: 'Available',
    },
    {
      name: 'Zapier',
      description: 'Connect opchestra to 5,000+ apps with Zapier triggers and actions.',
      icon: Zap,
      href: '#',
      status: 'Coming Soon',
    },
  ];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Integrations</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Connect opchestra with external tools and services.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <Link
            className="group rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700"
            href={integration.href}
            key={integration.name}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <integration.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{integration.name}</h3>
                <span
                  className={`text-xs font-medium ${
                    integration.status === 'Available'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400'
                  }`}
                >
                  {integration.status}
                </span>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {integration.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
