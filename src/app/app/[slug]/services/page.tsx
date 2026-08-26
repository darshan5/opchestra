'use client';

import { Plus, ShoppingBag } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  pricingType: string;
  published: boolean;
  category: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ServicesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const [svcRes, catRes] = await Promise.all([
        fetch(`/api/workspaces/${ws.id}/services`),
        fetch(`/api/workspaces/${ws.id}/services/categories`),
      ]);
      if (svcRes.ok) setServices(await svcRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function togglePublished(serviceId: string, published: boolean) {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/services/${serviceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !published }),
    });
    fetchData();
  }

  const filtered = activeCategory
    ? services.filter((s) => s.category?.id === activeCategory)
    : services;

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => router.push(`/app/${slug}/services/new`)}
        >
          <Plus className="h-4 w-4" />
          New Service
        </button>
      </div>

      {categories.length > 0 && (
        <div className="mt-4 flex gap-1">
          <button
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              !activeCategory
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
            )}
            onClick={() => setActiveCategory(null)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                activeCategory === cat.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
              )}
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No services yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((svc) => (
            <div
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-700"
              key={svc.id}
              onClick={() => router.push(`/app/${slug}/services/${svc.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-gray-900 dark:text-white">{svc.name}</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    ${svc.price.toFixed(2)}
                    <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                      {svc.currency}
                    </span>
                  </p>
                </div>
                <button
                  className={cn(
                    'relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors',
                    svc.published ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700',
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePublished(svc.id, svc.published);
                  }}
                  title={svc.published ? 'Published' : 'Draft'}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                      svc.published && 'translate-x-4',
                    )}
                  />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                    svc.pricingType === 'RECURRING'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                  )}
                >
                  {svc.pricingType === 'RECURRING' ? 'Recurring' : 'One-time'}
                </span>
                {svc.category && (
                  <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {svc.category.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
