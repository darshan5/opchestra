'use client';

import { formatDistanceToNow } from 'date-fns';
import { Copy } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface CommissionRow {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface AffiliateData {
  id: string;
  code: string;
  approved: boolean;
  commissions: CommissionRow[];
  _count: { clicks: number; commissions: number };
}

export default function PortalReferralsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;

      const sessRes = await fetch('/api/auth/session');
      const sess = await sessRes.json();
      if (!sess?.user?.id) return;

      const res = await fetch(`/api/workspaces/${ws.id}/referrals/affiliates`);
      if (!res.ok) return;
      const affiliates = await res.json();
      const mine = affiliates.find((a: { clientId: string }) => a.clientId === sess.user.id);
      if (!mine) return;

      const detailRes = await fetch(`/api/workspaces/${ws.id}/referrals/affiliates/${mine.id}`);
      if (detailRes.ok) setAffiliate(await detailRes.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function copyLink() {
    if (!affiliate) return;
    const link = `${window.location.origin}/api/referral/${affiliate.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  if (!affiliate) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrals</h1>
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You are not enrolled in the referral program yet.
          </p>
        </div>
      </div>
    );
  }

  const totalEarned = affiliate.commissions.reduce((sum, c) => sum + c.amount, 0);
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/referral/${affiliate.code}`;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrals</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Earned</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">${totalEarned.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Commissions</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{affiliate._count.commissions}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Clicks</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{affiliate._count.clicks}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your Referral Link</h2>
        <div className="mt-2 flex items-center gap-2">
          <input
            className="flex-1 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            readOnly
            value={referralLink}
          />
          <button
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={copyLink}
          >
            <Copy className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">Code: {affiliate.code}</p>
      </div>

      {affiliate.commissions.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Order</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {affiliate.commissions.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.orderId.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">${c.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                      c.status === 'UNPAID' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
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
