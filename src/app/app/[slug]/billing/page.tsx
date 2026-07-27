'use client';

import { CheckCircle, CreditCard, Users, XCircle } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkspaceInfo {
  id: string;
  name: string;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  seatLimit: number;
  memberCount: number;
}

function BillingContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspace(ws);
        }
      });
  }, [params.slug]);

  async function handleCheckout() {
    if (!workspace) {
      return;
    }
    setLoading(true);
    const res = await fetch('/api/stripe/checkout', {
      body: JSON.stringify({
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_placeholder',
        workspaceId: workspace.id,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  }

  async function handlePortal() {
    if (!workspace) {
      return;
    }
    setLoading(true);
    const res = await fetch('/api/stripe/portal', {
      body: JSON.stringify({ workspaceId: workspace.id }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
    setLoading(false);
  }

  if (!workspace) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const isActive = workspace.subscriptionStatus === 'active';
  const isFree = !workspace.subscriptionStatus || workspace.subscriptionStatus === 'cancelled';

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          <CheckCircle className="h-4 w-4" />
          Subscription activated successfully!
        </div>
      )}
      {cancelled && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
          <XCircle className="h-4 w-4" />
          Checkout was cancelled.
        </div>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isFree ? 'Free Plan' : 'Pro Plan'}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isFree
                ? `Up to ${workspace.seatLimit} members`
                : `Up to ${workspace.seatLimit} members`}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium',
              isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
            )}
          >
            {isActive ? 'Active' : 'Free'}
          </span>
        </div>

        {workspace.currentPeriodEnd && isActive && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Current period ends:{' '}
            {new Date(workspace.currentPeriodEnd).toLocaleDateString()}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Users className="h-4 w-4" />
          {workspace.memberCount || 1} / {workspace.seatLimit} members
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        {isFree ? (
          <Button loading={loading} onClick={handleCheckout}>
            <CreditCard className="mr-1 h-4 w-4" />
            Upgrade to Pro
          </Button>
        ) : (
          <Button loading={loading} onClick={handlePortal} variant="secondary">
            Manage Subscription
          </Button>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Plan Comparison</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className={cn(
            'rounded-xl border p-4',
            isFree
              ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
              : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
          )}>
            <h3 className="font-semibold text-gray-900 dark:text-white">Free</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">$0</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Up to 3 members</li>
              <li>Unlimited tasks</li>
              <li>Basic views</li>
              <li>5GB storage</li>
            </ul>
          </div>
          <div className={cn(
            'rounded-xl border p-4',
            isActive
              ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
              : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
          )}>
            <h3 className="font-semibold text-gray-900 dark:text-white">Pro</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              $9<span className="text-sm font-normal text-gray-500">/user/mo</span>
            </p>
            <ul className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Up to 50 members</li>
              <li>Unlimited tasks</li>
              <li>All views + Gantt</li>
              <li>50GB storage</li>
              <li>Custom fields</li>
              <li>SLA rules</li>
              <li>Priority support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
