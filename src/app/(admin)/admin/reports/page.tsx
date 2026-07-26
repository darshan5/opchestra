'use client';

import { useCallback, useEffect, useState } from 'react';

import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { WorkspaceDistChart } from '@/components/admin/WorkspaceDistChart';

interface ReportData {
  userGrowth: Array<{ month: string; count: number }>;
  workspaceDistribution: Array<{ name: string; value: number }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin/reports');
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UserGrowthChart data={data?.userGrowth ?? []} />
        <WorkspaceDistChart data={data?.workspaceDistribution ?? []} />
      </div>
    </div>
  );
}
