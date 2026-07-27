'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Clock, Play } from 'lucide-react';
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

interface ActiveTimerData {
  id: string;
  startedAt: string;
  pausedAt: string | null;
  totalPaused: number;
  notes: string | null;
  billable: boolean;
  user: { id: string; name: string | null; email: string; image: string | null };
  task: { id: string; title: string; project: { id: string; name: string } | null };
}

function elapsed(timer: ActiveTimerData): number {
  const start = new Date(timer.startedAt).getTime();
  const now = timer.pausedAt ? new Date(timer.pausedAt).getTime() : Date.now();
  return Math.max(0, Math.floor((now - start) / 1000) - timer.totalPaused);
}

function fmtElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) {
    return `${m}m`;
  }
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TimeTrackingPage() {
  const params = useParams<{ slug: string }>();
  const [tab, setTab] = useState<'in-progress' | 'my-time'>('in-progress');
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [activeTimers, setActiveTimers] = useState<ActiveTimerData[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [range, setRange] = useState('week');
  const [tick, setTick] = useState(0);

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

  useEffect(() => {
    if (tab === 'in-progress') {
      const iv = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(iv);
    }
  }, [tab]);

  const fetchTimers = useCallback(async () => {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/active-timers`);
    if (res.ok) {
      setActiveTimers(await res.json());
    }
  }, [workspaceId]);

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
    if (tab === 'in-progress') {
      fetchTimers();
      const iv = setInterval(fetchTimers, 30000);
      return () => clearInterval(iv);
    }
    fetchEntries();
  }, [tab, fetchTimers, fetchEntries]);

  const billableMinutes = entries.filter((e) => e.billable).reduce((s, e) => s + e.duration, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <button
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'in-progress'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setTab('in-progress')}
          type="button"
        >
          <Play className="h-3.5 w-3.5" />
          In Progress
          {activeTimers.length > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-500 px-1.5 text-[10px] font-bold text-white">
              {activeTimers.length}
            </span>
          )}
        </button>
        <button
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'my-time'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          onClick={() => setTab('my-time')}
          type="button"
        >
          <Clock className="h-3.5 w-3.5" />
          My Time
        </button>
      </div>

      {/* In Progress Tab */}
      {tab === 'in-progress' && (
        <div className="mt-6">
          {activeTimers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Play className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                No active timers right now
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Person</th>
                    <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Task</th>
                    <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Started</th>
                    <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Elapsed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Billable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {activeTimers.map((timer) => (
                    <tr key={timer.id}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {(timer.user.name ?? timer.user.email).substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {timer.user.name ?? timer.user.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                        {timer.task.title}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                        {timer.task.project?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(timer.startedAt), 'h:mm a')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-green-100 px-2 py-1 font-mono text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                          {fmtElapsed(elapsed(timer))}
                        </span>
                        {timer.pausedAt && (
                          <span className="ml-2 text-[10px] text-amber-500">PAUSED</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {timer.billable ? (
                          <span className="text-green-600 dark:text-green-400">$</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">$</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* suppress unused tick warning */}
          <span className="hidden">{tick}</span>
        </div>
      )}

      {/* My Time Tab */}
      {tab === 'my-time' && (
        <div className="mt-6">
          <div className="flex items-center justify-end">
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

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

          <div className="mt-6">
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
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Task</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Notes</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Billable</th>
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
      )}
    </div>
  );
}
