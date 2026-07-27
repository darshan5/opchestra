'use client';

import { formatDistanceToNow } from 'date-fns';
import { Check } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

interface WorkspaceBilling {
  id: string;
  name: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  seatLimit: number;
  memberCount: number;
  stripePlanId: string | null;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceAnnual: number;
  maxUsers: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
  features: string[] | null;
  isActive: boolean;
}

export default function BillingPage() {
  const params = useParams<{ slug: string }>();
  const [billing, setBilling] = useState<WorkspaceBilling | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/workspaces').then((r) => r.json()),
      fetch('/api/billing/plans').then((r) => r.json()),
    ]).then(([workspaces, plansData]) => {
      const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
      if (ws) {
        fetch(`/api/workspaces/${ws.id}/billing`)
          .then((r) => r.json())
          .then((data) => {
            setBilling(data);
            setLoading(false);
          });
      }
      if (Array.isArray(plansData)) {
        setPlans(plansData.filter((p: Plan) => p.isActive));
      }
    });
  }, [params.slug]);

  async function handleCheckout(priceId: string) {
    if (!billing) {
      return;
    }
    setActionLoading(true);
    const res = await fetch('/api/stripe/checkout', {
      body: JSON.stringify({ priceId, workspaceId: billing.id }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setActionLoading(false);
  }

  async function handlePortal() {
    if (!billing) {
      return;
    }
    setActionLoading(true);
    const res = await fetch('/api/stripe/portal', {
      body: JSON.stringify({ workspaceId: billing.id }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading billing...</p>
      </div>
    );
  }

  const hasSubscription = billing?.subscriptionStatus === 'active' || billing?.subscriptionStatus === 'trialing';

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Plan</h2>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasSubscription ? (
                <>
                  Status:{' '}
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {billing?.subscriptionStatus}
                  </span>
                </>
              ) : (
                <span className="font-medium text-gray-700 dark:text-gray-300">Free Plan</span>
              )}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {billing?.memberCount} / {billing?.seatLimit} seats used
            </p>
            {billing?.currentPeriodEnd && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Renews {formatDistanceToNow(new Date(billing.currentPeriodEnd), { addSuffix: true })}
              </p>
            )}
          </div>
          {hasSubscription && (
            <Button loading={actionLoading} onClick={handlePortal} variant="secondary">
              Manage Subscription
            </Button>
          )}
        </div>
      </div>

      {!hasSubscription && plans.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upgrade</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                key={plan.id}
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                {plan.description && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {plan.description}
                  </p>
                )}
                <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                  ${plan.priceMonthly}
                  <span className="text-sm font-normal text-gray-500">/user/mo</span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  or ${plan.priceAnnual}/user/yr
                </p>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Up to {plan.maxUsers} users
                </p>
                {plan.features && Array.isArray(plan.features) && (
                  <ul className="mt-3 space-y-1">
                    {plan.features.map((f: string, i: number) => (
                      <li className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400" key={i}>
                        <Check className="h-3 w-3 text-green-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4 space-y-2">
                  {plan.stripePriceIdMonthly && (
                    <Button
                      className="w-full"
                      loading={actionLoading}
                      onClick={() => handleCheckout(plan.stripePriceIdMonthly!)}
                      size="sm"
                    >
                      Subscribe Monthly
                    </Button>
                  )}
                  {plan.stripePriceIdAnnual && (
                    <Button
                      className="w-full"
                      loading={actionLoading}
                      onClick={() => handleCheckout(plan.stripePriceIdAnnual!)}
                      size="sm"
                      variant="secondary"
                    >
                      Subscribe Annual
                    </Button>
                  )}
                  {!plan.stripePriceIdMonthly && !plan.stripePriceIdAnnual && (
                    <p className="text-center text-xs text-gray-400">Stripe not configured</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
