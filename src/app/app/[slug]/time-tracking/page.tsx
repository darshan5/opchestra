'use client';

import { formatDistanceToNow } from 'date-fns';
import { Clock } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface TimeEntryData {
  id: string;
  duration: number;
  date: string;
  notes: string | null;
  billable: boolean;
  task: {
    id: string;
    title: string;
    project: { id: string; name: string } | null;
  };
}

export default function TimeTrackingPage() {
  const params = useParams<{ slug: string }>();
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [range, setRange] = useState('week');

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((ws) => {
        const w = ws.find((x: { slug: string }) => x.slug === params.slug);
        if (w) {
          setWorkspaceId(w.id);
        }
      });
  }, [params.slug]);

  const fetchEntries = useCallback(async () => {
    if (!workspaceId) {
      return;
    }
    const now = new Date();
    let from: Date;
    if (range === 'week') {
      from = new Date(now);
      from.setDate(from.getDate() - 7);
    } else if (range === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      from = new Date(now);
      from.setDate(from.getDate() - 30);
    }

    const res = await fetch(
      `/api/workspaces/${workspaceId}/time-entries?from=${from.toISOString()}&to=${now.toISOString()}`,
    );
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotalMinutes(data.totalMinutes);
    }
  }, [workspaceId, range]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function formatDuration(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) {
      return `${m}m`;
    }
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  const billableMinutes = entries.filter((e) => e.billable).reduce((s, e) => s + e.duration, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your logged time across all tasks
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
          {['week', 'month', 'all'].map((r) => (
            <button
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
              key={r}
              onClick={() => setRange(r)}
            >
              {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Time</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {formatDuration(totalMinutes)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Billable</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
            {formatDuration(billableMinutes)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Entries</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{entries.length}</p>
        </div>
      </div>

      <div className="mt-8">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No time logged in this period
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Task
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Project
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Duration
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Notes
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Billable
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(e.date), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                      {e.task.title}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                      {e.task.project?.name ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                      {formatDuration(e.duration)}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                      {e.notes ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {e.billable ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
