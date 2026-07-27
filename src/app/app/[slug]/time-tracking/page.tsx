'use client';

import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  BarChart3,
  ChevronDown,
  Clock,
  DollarSign,
  LayoutGrid,
  Play,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { cn } from '@/lib/utils';

interface TimeEntryData {
  id: string;
  duration: number;
  date: string;
  notes: string | null;
  billable: boolean;
  user: { id: string; name: string | null; email: string; image: string | null };
  task: {
    id: string;
    title: string;
    priority: string;
    project: { id: string; name: string } | null;
    taskGroup: { id: string; name: string; color: string } | null;
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

interface MemberData {
  id: string;
  name: string | null;
  email: string;
}

type DatePreset = 'today' | 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'custom';
type WidgetKey = 'project' | 'group' | 'priority' | 'company';

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#F97316',
  LOW: '#3B82F6',
  MEDIUM: '#EAB308',
  NONE: '#9CA3AF',
  URGENT: '#EF4444',
};

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

function getDateRange(preset: DatePreset): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: new Date(now.setHours(0, 0, 0, 0)), to: new Date() };
    case 'this-week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last-week': {
      const lw = subWeeks(now, 1);
      return { from: startOfWeek(lw, { weekStartsOn: 1 }), to: endOfWeek(lw, { weekStartsOn: 1 }) };
    }
    case 'this-month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last-month': {
      const lm = subMonths(now, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    default:
      return { from: subWeeks(now, 1), to: new Date() };
  }
}

function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
  }
  return result;
}

export default function TimeTrackingPage() {
  const params = useParams<{ slug: string }>();
  const [tab, setTab] = useState<'in-progress' | 'my-time'>('in-progress');
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [billableMinutes, setBillableMinutes] = useState(0);
  const [activeTimers, setActiveTimers] = useState<ActiveTimerData[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [selectedPerson, setSelectedPerson] = useState('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('this-week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [tick, setTick] = useState(0);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [widgets, setWidgets] = useState<Set<WidgetKey>>(() => {
    if (typeof window === 'undefined') {
      return new Set(['project', 'group', 'priority', 'company']);
    }
    const stored = localStorage.getItem('time-tracking-widgets');
    if (stored) {
      try {
        return new Set(JSON.parse(stored) as WidgetKey[]);
      } catch {
        return new Set(['project', 'group', 'priority', 'company']);
      }
    }
    return new Set(['project', 'group', 'priority', 'company']);
  });

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
    if (!workspaceId) {
      return;
    }
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(data.map((m: { user: MemberData }) => m.user));
        }
      });
  }, [workspaceId]);

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
    let from: Date;
    let to: Date;
    if (datePreset === 'custom') {
      from = customFrom ? new Date(customFrom) : subWeeks(new Date(), 1);
      to = customTo ? new Date(customTo) : new Date();
    } else {
      const range = getDateRange(datePreset);
      from = range.from;
      to = range.to;
    }

    const userParam = isAdmin ? (selectedPerson === 'all' ? 'all' : selectedPerson) : '';
    const url = `/api/workspaces/${workspaceId}/time-entries?from=${from.toISOString()}&to=${to.toISOString()}${userParam ? `&userId=${userParam}` : ''}`;

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotalMinutes(data.totalMinutes);
      setBillableMinutes(data.billableMinutes);
      setIsAdmin(data.isAdmin);
    }
  }, [workspaceId, datePreset, customFrom, customTo, selectedPerson, isAdmin]);

  useEffect(() => {
    if (tab === 'in-progress') {
      fetchTimers();
      const iv = setInterval(fetchTimers, 30000);
      return () => clearInterval(iv);
    }
    fetchEntries();
  }, [tab, fetchTimers, fetchEntries]);

  function toggleWidget(key: WidgetKey) {
    setWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      localStorage.setItem('time-tracking-widgets', JSON.stringify([...next]));
      return next;
    });
  }

  const nonBillableMinutes = totalMinutes - billableMinutes;
  const billablePercent = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  // Chart data
  const byProject = Object.entries(groupBy(entries, (e) => e.task.project?.name ?? 'No Project')).map(
    ([name, items]) => ({ name, hours: Math.round((items.reduce((s, e) => s + e.duration, 0) / 60) * 10) / 10 }),
  );

  const byGroup = Object.entries(groupBy(entries, (e) => e.task.taskGroup?.name ?? 'Ungrouped')).map(
    ([name, items]) => ({ name, hours: Math.round((items.reduce((s, e) => s + e.duration, 0) / 60) * 10) / 10 }),
  );

  const byPriority = Object.entries(groupBy(entries, (e) => e.task.priority)).map(
    ([name, items]) => ({
      color: PRIORITY_COLORS[name] ?? '#9CA3AF',
      name,
      hours: Math.round((items.reduce((s, e) => s + e.duration, 0) / 60) * 10) / 10,
    }),
  );

  const byCompany = Object.entries(groupBy(entries, () => 'Direct')).map(
    ([name, items]) => ({ name, hours: Math.round((items.reduce((s, e) => s + e.duration, 0) / 60) * 10) / 10 }),
  );

  const presets: Array<{ label: string; value: DatePreset }> = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'this-week' },
    { label: 'Last Week', value: 'last-week' },
    { label: 'This Month', value: 'this-month' },
    { label: 'Last Month', value: 'last-month' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        <button
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            tab === 'in-progress'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400',
          )}
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
          className={cn(
            'flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            tab === 'my-time'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400',
          )}
          onClick={() => setTab('my-time')}
          type="button"
        >
          <Clock className="h-3.5 w-3.5" />
          {isAdmin ? 'Time Log' : 'My Time'}
        </button>
      </div>

      {/* ── In Progress Tab ─────────────── */}
      {tab === 'in-progress' && (
        <div className="mt-6">
          {activeTimers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Play className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No active timers right now</p>
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
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{timer.task.title}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{timer.task.project?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{format(new Date(timer.startedAt), 'h:mm a')}</td>
                      <td className="px-4 py-2.5">
                        <span className="rounded bg-green-100 px-2 py-1 font-mono text-sm font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                          {fmtElapsed(elapsed(timer))}
                        </span>
                        {timer.pausedAt && <span className="ml-2 text-[10px] text-amber-500">PAUSED</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={timer.billable ? 'text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}>$</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <span className="hidden">{tick}</span>
        </div>
      )}

      {/* ── My Time / Time Log Tab ─────────── */}
      {tab === 'my-time' && (
        <div className="mt-6">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 dark:text-gray-400">Person:</span>
                <select
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  onChange={(e) => setSelectedPerson(e.target.value)}
                  value={selectedPerson}
                >
                  <option value="all">All Members</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1">
              {presets.map((p) => (
                <button
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    datePreset === p.value
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                  )}
                  key={p.value}
                  onClick={() => setDatePreset(p.value)}
                  type="button"
                >
                  {p.label}
                </button>
              ))}
              <button
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  datePreset === 'custom'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                )}
                onClick={() => setDatePreset('custom')}
                type="button"
              >
                Custom
              </button>
            </div>

            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  onChange={(e) => setCustomFrom(e.target.value)}
                  type="date"
                  value={customFrom}
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  onChange={(e) => setCustomTo(e.target.value)}
                  type="date"
                  value={customTo}
                />
              </div>
            )}

            <div className="relative ml-auto">
              <button
                className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => setShowWidgetMenu(!showWidgetMenu)}
                type="button"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Widgets
                <ChevronDown className="h-3 w-3" />
              </button>
              {showWidgetMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  {[
                    { key: 'project' as WidgetKey, label: 'Time by Project' },
                    { key: 'group' as WidgetKey, label: 'Time by Group' },
                    { key: 'priority' as WidgetKey, label: 'Time by Priority' },
                    { key: 'company' as WidgetKey, label: 'Time by Company' },
                  ].map((w) => (
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800" key={w.key}>
                      <input
                        checked={widgets.has(w.key)}
                        className="h-3.5 w-3.5 rounded"
                        onChange={() => toggleWidget(w.key)}
                        type="checkbox"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{w.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-white">{formatDuration(totalMinutes)}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-green-600 dark:text-green-400" />
                <p className="text-xs text-green-600 dark:text-green-400">Billable</p>
              </div>
              <p className="mt-0.5 text-xl font-bold text-green-700 dark:text-green-300">{formatDuration(billableMinutes)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">Non-Billable</p>
              <p className="mt-0.5 text-xl font-bold text-gray-600 dark:text-gray-400">{formatDuration(nonBillableMinutes)}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-xs text-blue-600 dark:text-blue-400">Billable %</p>
              <p className="mt-0.5 text-xl font-bold text-blue-700 dark:text-blue-300">{billablePercent}%</p>
            </div>
          </div>

          {/* Charts */}
          {widgets.size > 0 && entries.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {widgets.has('project') && byProject.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Time by Project</h3>
                  </div>
                  <ResponsiveContainer height={200} width="100%">
                    <BarChart data={byProject} layout="vertical" margin={{ left: 60 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip formatter={(v) => `${v}h`} />
                      <Bar dataKey="hours" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {widgets.has('group') && byGroup.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Time by Group</h3>
                  </div>
                  <ResponsiveContainer height={200} width="100%">
                    <BarChart data={byGroup} layout="vertical" margin={{ left: 60 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip formatter={(v) => `${v}h`} />
                      <Bar dataKey="hours" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {widgets.has('priority') && byPriority.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Time by Priority</h3>
                  </div>
                  <ResponsiveContainer height={200} width="100%">
                    <PieChart>
                      <Pie cx="50%" cy="50%" data={byPriority} dataKey="hours" innerRadius={50} nameKey="name" outerRadius={80}>
                        {byPriority.map((entry) => (
                          <Cell fill={entry.color} key={entry.name} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}h`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {widgets.has('company') && byCompany.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-gray-400" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Time by Company</h3>
                  </div>
                  <ResponsiveContainer height={200} width="100%">
                    <BarChart data={byCompany} layout="vertical" margin={{ left: 60 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip formatter={(v) => `${v}h`} />
                      <Bar dataKey="hours" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Time Entries Table */}
          <div className="mt-6">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Clock className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No time logged in this period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Date</th>
                      {isAdmin && (
                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Person</th>
                      )}
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Task</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Project</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">$</th>
                      <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(e.date), 'MMM d')}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                {(e.user.name ?? e.user.email).substring(0, 2).toUpperCase()}
                              </div>
                              <span className="text-xs text-gray-700 dark:text-gray-300">{e.user.name ?? e.user.email}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{e.task.title}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{e.task.project?.name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{formatDuration(e.duration)}</td>
                        <td className="px-4 py-2.5">
                          <span className={e.billable ? 'font-medium text-green-600 dark:text-green-400' : 'text-gray-300 dark:text-gray-600'}>$</span>
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{e.notes ?? '—'}</td>
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
