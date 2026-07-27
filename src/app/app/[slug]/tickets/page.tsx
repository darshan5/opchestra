'use client';

import { format } from 'date-fns';
import { ListPlus, Plus, Ticket } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { TaskDetailPanel } from '@/components/tasks/task-detail-panel';
import { TicketDetailPanel } from '@/components/tickets/ticket-detail-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TicketData {
  id: string;
  title: string;
  ticketNumber: string;
  status: string;
  priority: string;
  source: string | null;
  contact: { id: string; name: string; email: string | null } | null;
  ticketCompany: { id: string; name: string } | null;
  assignee: { id: string; name: string | null; email: string } | null;
  slaResponseDue: string | null;
  slaResolutionDue: string | null;
  createdAt: string;
}

interface MemberData {
  id: string;
  name: string | null;
  email: string;
}

interface ContactData {
  id: string;
  name: string;
  email: string | null;
  companyId: string | null;
}

function getSlaStatus(due: string | null): 'ok' | 'warning' | 'breached' | null {
  if (!due) return null;
  const now = Date.now();
  const dueMs = new Date(due).getTime();
  if (now > dueMs) return 'breached';
  if (dueMs - now < 3600000) return 'warning';
  return 'ok';
}

const statusColors: Record<string, string> = {
  Closed: 'bg-gray-500 text-white',
  'In Progress': 'bg-amber-500 text-white',
  Open: 'bg-blue-500 text-white',
  Resolved: 'bg-green-500 text-white',
  'Waiting on Customer': 'bg-purple-500 text-white',
};

const priorityColors: Record<string, string> = {
  HIGH: 'bg-orange-500 text-white',
  LOW: 'bg-green-500 text-white',
  MEDIUM: 'bg-yellow-500 text-white',
  URGENT: 'bg-red-500 text-white',
};

const slaColors: Record<string, string> = {
  breached: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  ok: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

const statusTabs = ['All', 'Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'];

export default function TicketsPage() {
  const params = useParams<{ slug: string }>();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [workspaceId, setWorkspaceId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [createTaskFor, setCreateTaskFor] = useState<TicketData | null>(null);
  const [taskName, setTaskName] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [contactId, setContactId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((ws) => {
        const w = ws.find((x: { slug: string }) => x.slug === params.slug);
        if (w) setWorkspaceId(w.id);
      });
  }, [params.slug]);

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then((r) => r.json())
      .then((data) => setMembers(data.map((m: { user: MemberData }) => m.user)));
    fetch(`/api/workspaces/${workspaceId}/contacts`)
      .then((r) => r.json())
      .then((data) => setContacts(data));
  }, [workspaceId]);

  const loadTickets = useCallback(async () => {
    if (!workspaceId) return;
    const q = activeTab !== 'All' ? `?status=${encodeURIComponent(activeTab)}` : '';
    const res = await fetch(`/api/workspaces/${workspaceId}/tickets${q}`);
    if (res.ok) setTickets(await res.json());
  }, [workspaceId, activeTab]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  async function createTicket() {
    if (!subject.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, description: description || undefined, priority, assigneeId: assigneeId || undefined, contactId: contactId || undefined, source: 'Manual' }),
    });
    if (res.ok) {
      setSubject(''); setDescription(''); setPriority('MEDIUM'); setAssigneeId(''); setContactId('');
      setShowCreate(false); loadTickets();
    }
    setSaving(false);
  }

  async function handleCreateTask() {
    if (!createTaskFor || !taskName.trim()) return;
    setCreatingTask(true);
    await fetch(`/api/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: taskName.trim(), sourceTicketId: createTaskFor.id, priority: createTaskFor.priority, assigneeId: createTaskFor.assignee?.id }),
    });
    setCreatingTask(false);
    setCreateTaskFor(null);
    setTaskName('');
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage support and service tickets</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="mr-1 h-4 w-4" /> New Ticket
        </Button>
      </div>

      {showCreate && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-3">
            <Input id="subject" label="Subject" onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary" required value={subject} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
              <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" onChange={(e) => setPriority(e.target.value)} value={priority}>
                <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" onChange={(e) => setDescription(e.target.value)} placeholder="Detailed description..." rows={3} value={description} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsible Person</label>
              <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" onChange={(e) => setAssigneeId(e.target.value)} value={assigneeId}>
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact</label>
              <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" onChange={(e) => setContactId(e.target.value)} value={contactId}>
                <option value="">No contact</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={saving} onClick={createTicket} size="sm">Create Ticket</Button>
            <Button onClick={() => setShowCreate(false)} size="sm" variant="ghost">Cancel</Button>
          </div>
        </div>
      )}

      {/* Create Task dialog */}
      {createTaskFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Create Task from {createTaskFor.ticketNumber}
            </h3>
            <input
              autoFocus
              className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              onChange={(e) => setTaskName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
              placeholder="Task name"
              value={taskName}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button className="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => { setCreateTaskFor(null); setTaskName(''); }}>Cancel</button>
              <button className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!taskName.trim() || creatingTask} onClick={handleCreateTask}>
                {creatingTask ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1">
        {statusTabs.map((tab) => (
          <button
            className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors', activeTab === tab ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400')}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table view */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Ticket #</th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Subject</th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Priority</th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Person</th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Contact</th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Company</th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Date</th>
              <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">SLA</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tickets.map((t) => {
              const sla = getSlaStatus(t.slaResolutionDue);
              const slaHidden = t.status === 'Closed' || t.status === 'Resolved';
              return (
                <tr
                  className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{t.ticketNumber}</td>
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{t.title}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', statusColors[t.status] ?? 'bg-gray-200 text-gray-700')}>{t.status}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', priorityColors[t.priority] ?? 'bg-gray-200 text-gray-700')}>{t.priority.toLowerCase()}</span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-400">
                    {t.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {(t.assignee.name ?? t.assignee.email).substring(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate text-xs">{t.assignee.name ?? t.assignee.email}</span>
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{t.contact?.name ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{t.ticketCompany?.name ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">{format(new Date(t.createdAt), 'MMM d')}</td>
                  <td className="px-3 py-2.5">
                    {sla && !slaHidden && (
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', slaColors[sla])}>
                        {sla === 'breached' ? 'Breached' : sla === 'warning' ? 'At Risk' : 'OK'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                      onClick={(e) => { e.stopPropagation(); setCreateTaskFor(t); setTaskName(t.title); }}
                      title="Create task from ticket"
                    >
                      <ListPlus className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {tickets.length === 0 && (
              <tr><td className="px-3 py-8 text-center text-sm text-gray-500" colSpan={10}>No tickets yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTicketId && workspaceId && (
        <TicketDetailPanel
          members={members}
          onClose={() => setSelectedTicketId(null)}
          onOpenTask={(taskId) => setOpenTaskId(taskId)}
          onUpdate={loadTickets}
          ticketId={selectedTicketId}
          workspaceId={workspaceId}
        />
      )}

      {openTaskId && workspaceId && (
        <TaskDetailPanel
          members={members.map((m) => ({ ...m, image: null }))}
          onClose={() => setOpenTaskId(null)}
          projects={[]}
          taskId={openTaskId}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
