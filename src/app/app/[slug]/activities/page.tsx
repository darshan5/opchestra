'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Bell, Calendar, CheckSquare, FileText, Mail, Phone, Plus, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface ActivityRow {
  id: string;
  type: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  completed: boolean;
  contactId: string | null;
  companyId: string | null;
  contact?: { name: string } | null;
  company?: { name: string } | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, typeof Phone> = {
  CALL: Phone,
  NOTE: FileText,
  EMAIL: Mail,
  MEETING: Calendar,
  FOLLOW_UP: Bell,
  CUSTOM: CheckSquare,
};

const TYPE_COLORS: Record<string, string> = {
  CALL: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
  NOTE: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  EMAIL: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  MEETING: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
  FOLLOW_UP: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  CUSTOM: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
};

export default function ActivitiesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState('CALL');
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const url = showCompleted
        ? `/api/workspaces/${ws.id}/activities`
        : `/api/workspaces/${ws.id}/activities?completed=false`;
      const res = await fetch(url);
      if (res.ok) setActivities(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug, showCompleted]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  async function toggleComplete(id: string, completed: boolean) {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/activities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed }),
    });
    setActivities((prev) => prev.map((a) => a.id === id ? { ...a, completed: !completed } : a));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !workspaceId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          title: newTitle.trim(),
          notes: newNotes.trim() || null,
          dueDate: newDueDate || null,
        }),
      });
      if (res.ok) {
        setNewTitle('');
        setNewNotes('');
        setNewDueDate('');
        setShowAdd(false);
        fetchActivities();
      }
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  const withDue = activities.filter((a) => a.dueDate && !a.completed).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  const noDue = activities.filter((a) => !a.dueDate && !a.completed);
  const completed = activities.filter((a) => a.completed);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activities</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <input checked={showCompleted} className="rounded" onChange={(e) => setShowCompleted(e.target.checked)} type="checkbox" />
            Show completed
          </label>
          <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            Log Activity
          </button>
        </div>
      </div>

      {showAdd && (
        <form className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" onSubmit={handleAdd}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Log Activity</h2>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setShowAdd(false)} type="button"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setNewType(e.target.value)} value={newType}>
              <option value="CALL">Call</option>
              <option value="NOTE">Note</option>
              <option value="EMAIL">Email</option>
              <option value="MEETING">Meeting</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="CUSTOM">Custom</option>
            </select>
            <input className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setNewDueDate(e.target.value)} placeholder="Due date" type="date" value={newDueDate} />
          </div>
          <input autoFocus className="mt-3 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setNewTitle(e.target.value)} placeholder="Title *" required value={newTitle} />
          <textarea className="mt-3 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes (optional)" rows={2} value={newNotes} />
          <button className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={adding} type="submit">
            {adding ? 'Saving...' : 'Save Activity'}
          </button>
        </form>
      )}

      <div className="mt-6 space-y-6">
        {withDue.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Due</h2>
            <div className="mt-2 space-y-1">
              {withDue.map((a) => {
                const Icon = TYPE_ICONS[a.type] ?? CheckSquare;
                const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();
                return (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900" key={a.id}>
                    <button className={cn('h-4 w-4 shrink-0 rounded border', a.completed ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600')} onClick={() => toggleComplete(a.id, a.completed)} />
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded', TYPE_COLORS[a.type])}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900 dark:text-white">{a.title}</p>
                      {(a.contact || a.company) && (
                        <p className="truncate text-xs text-gray-400">{a.contact?.name ?? a.company?.name}</p>
                      )}
                    </div>
                    <span className={cn('shrink-0 text-xs', isOverdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-gray-500')}>
                      {a.dueDate && format(new Date(a.dueDate), 'MMM d')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {noDue.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">No Due Date</h2>
            <div className="mt-2 space-y-1">
              {noDue.map((a) => {
                const Icon = TYPE_ICONS[a.type] ?? CheckSquare;
                return (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900" key={a.id}>
                    <button className={cn('h-4 w-4 shrink-0 rounded border', a.completed ? 'border-green-500 bg-green-500' : 'border-gray-300 dark:border-gray-600')} onClick={() => toggleComplete(a.id, a.completed)} />
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded', TYPE_COLORS[a.type])}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900 dark:text-white">{a.title}</p>
                      {(a.contact || a.company) && (
                        <p className="truncate text-xs text-gray-400">{a.contact?.name ?? a.company?.name}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showCompleted && completed.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Completed</h2>
            <div className="mt-2 space-y-1">
              {completed.map((a) => {
                const Icon = TYPE_ICONS[a.type] ?? CheckSquare;
                return (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 opacity-60 dark:border-gray-800 dark:bg-gray-900" key={a.id}>
                    <button className="h-4 w-4 shrink-0 rounded border border-green-500 bg-green-500" onClick={() => toggleComplete(a.id, a.completed)} />
                    <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded', TYPE_COLORS[a.type])}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm text-gray-500 line-through">{a.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activities.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No activities yet. Log a call, note, or meeting to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
