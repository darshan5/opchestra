'use client';

import { formatDistanceToNow } from 'date-fns';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface AffiliateRow {
  id: string;
  clientName: string | null;
  clientEmail: string;
  code: string;
  approved: boolean;
  totalEarned: number;
  clickCount: number;
  createdAt: string;
}

export default function AffiliatesPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;

      const res = await fetch(`/api/workspaces/${ws.id}/referrals/affiliates`);
      if (res.ok) setAffiliates(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Affiliates</h1>

      {affiliates.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No affiliates yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Code</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Earned</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Clicks</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {affiliates.map((a) => (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" key={a.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-white">{a.clientName ?? '—'}</p>
                    <p className="text-xs text-gray-500">{a.clientEmail}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{a.code}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${a.approved ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'}`}>
                      {a.approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">${a.totalEarned.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.clickCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
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
