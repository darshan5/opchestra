'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { ExternalLink, Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { NotesSection } from '@/components/notes/notes-section';
import { cn } from '@/lib/utils';

interface TicketDetailPanelProps {
  ticketId: string;
  workspaceId: string;
  members: Array<{ id: string; name: string | null; email: string }>;
  onClose: () => void;
  onUpdate?: () => void;
  onOpenTask?: (taskId: string) => void;
}

interface TicketDetail {
  id: string;
  title: string;
  ticketNumber: string;
  status: string;
  priority: string;
  description: unknown;
  source: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
  contact: { id: string; name: string; email: string | null } | null;
  ticketCompany: { id: string; name: string } | null;
  slaResponseDue: string | null;
  slaResolutionDue: string | null;
  createdAt: string;
  linkedTasks: Array<{ id: string; title: string; status: string }>;
}

interface CommentData {
  id: string;
  content: { type?: string; text?: string } | string;
  user: { name: string | null; email: string };
  createdAt: string;
}

const STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'];

export function TicketDetailPanel({
  members,
  onClose,
  onOpenTask,
  onUpdate,
  ticketId,
  workspaceId,
}: TicketDetailPanelProps) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [tab, setTab] = useState<'details' | 'notes' | 'activity'>('details');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);

  const fetchTicket = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${ticketId}`);
    if (res.ok) {
      const data = await res.json();
      setTicket(data);
      setTitleDraft(data.title);
      const desc = data.description;
      setDescDraft(typeof desc === 'string' ? desc : desc?.text ?? '');
    }
  }, [workspaceId, ticketId]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${ticketId}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
  }, [workspaceId, ticketId]);

  useEffect(() => {
    fetchTicket();
    fetchComments();
    fetch(`/api/workspaces/${workspaceId}/companies`)
      .then((r) => r.ok ? r.json() : [])
      .then(setCompanies)
      .catch(() => {});
  }, [fetchTicket, fetchComments, workspaceId]);

  async function patchTicket(data: Record<string, unknown>) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setTicket((prev) => (prev ? { ...prev, ...updated } : prev));
      onUpdate?.();
    }
  }

  async function saveTitle() {
    if (titleDraft.trim() && titleDraft !== ticket?.title) {
      await patchTicket({ title: titleDraft.trim() });
    }
    setEditingTitle(false);
  }

  async function saveDesc() {
    await patchTicket({ description: descDraft });
    setEditingDesc(false);
  }


  async function createTaskFromTicket() {
    if (!ticket || !newTaskName.trim()) return;
    setCreatingTask(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTaskName.trim(),
        description: ticket.description,
        priority: ticket.priority,
        assigneeId: ticket.assignee?.id,
        sourceTicketId: ticket.id,
      }),
    });
    if (res.ok) {
      fetchTicket();
      setShowCreateTask(false);
      setNewTaskName('');
    }
    setCreatingTask(false);
  }

  if (!ticket) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg items-center justify-center border-l border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs text-gray-400">{ticket.ticketNumber}</span>
            {editingTitle ? (
              <input
                autoFocus
                className="mt-1 block w-full rounded border border-blue-400 bg-white px-2 py-1 text-lg font-semibold text-gray-900 dark:bg-gray-900 dark:text-white"
                onBlur={saveTitle}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                value={titleDraft}
              />
            ) : (
              <h2
                className="mt-1 cursor-pointer text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white"
                onClick={() => setEditingTitle(true)}
              >
                {ticket.title}
              </h2>
            )}
            <div className="mt-2 flex items-center gap-2">
              <select
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer',
                  ticket.status === 'Open'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : ticket.status === 'In Progress'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      : ticket.status === 'Resolved' || ticket.status === 'Closed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                )}
                onChange={(e) => patchTicket({ status: e.target.value })}
                value={ticket.status}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            className="ml-2 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5 dark:border-gray-800">
          {(['details', 'notes', 'activity'] as const).map((t) => (
            <button
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                tab === t
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
              )}
              key={t}
              onClick={() => setTab(t)}
            >
              {t === 'details' ? 'Details' : t === 'notes' ? 'Notes' : 'Activity'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'details' && (
            <div className="space-y-4">
              {/* Priority */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  onChange={(e) => patchTicket({ priority: e.target.value })}
                  value={ticket.priority}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Responsible Person */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Responsible Person</label>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  onChange={(e) => patchTicket({ assigneeId: e.target.value || null })}
                  value={ticket.assignee?.id ?? ''}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                  ))}
                </select>
              </div>

              {/* Contact & Company */}
              {ticket.contact && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Contact</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket.contact.name}</p>
                  {ticket.contact.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ticket.contact.email}</p>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Company</label>
                <select
                  className="mt-1 block w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => patchTicket({ companyId: e.target.value || null })}
                  value={ticket.ticketCompany?.id ?? ''}
                >
                  <option value="">No company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Source & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Source</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{ticket.source ?? 'Manual'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Created</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>

              {/* SLA */}
              {(ticket.slaResponseDue || ticket.slaResolutionDue) && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">SLA</label>
                  <div className="mt-1 space-y-1">
                    {ticket.slaResponseDue && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Response due: {formatDistanceToNow(new Date(ticket.slaResponseDue), { addSuffix: true })}
                      </p>
                    )}
                    {ticket.slaResolutionDue && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Resolution due: {formatDistanceToNow(new Date(ticket.slaResolutionDue), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
                {editingDesc ? (
                  <div className="mt-1">
                    <textarea
                      autoFocus
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      onChange={(e) => setDescDraft(e.target.value)}
                      rows={4}
                      value={descDraft}
                    />
                    <div className="mt-1 flex gap-2">
                      <button className="text-xs font-medium text-blue-600" onClick={saveDesc}>Save</button>
                      <button className="text-xs text-gray-500" onClick={() => setEditingDesc(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="mt-1 min-h-[40px] cursor-pointer rounded-lg border border-transparent p-2 text-sm text-gray-700 hover:border-gray-300 dark:text-gray-300 dark:hover:border-gray-600"
                    onClick={() => setEditingDesc(true)}
                  >
                    {descDraft || 'Click to add description...'}
                  </p>
                )}
              </div>

              {/* Linked Tasks */}
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Linked Tasks</label>
                {ticket.linkedTasks?.length > 0 ? (
                  <div className="mt-1 space-y-1">
                    {ticket.linkedTasks.map((t) => (
                      <button
                        className="flex w-full items-center gap-2 rounded border border-gray-200 px-2 py-1.5 text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        key={t.id}
                        onClick={() => { if (onOpenTask) { onClose(); onOpenTask(t.id); } }}
                        type="button"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-gray-900 dark:text-white">{t.title}</span>
                        <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">{t.status}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">No linked tasks</p>
                )}
                {showCreateTask ? (
                  <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950">
                    <input
                      autoFocus
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !creatingTask && createTaskFromTicket()}
                      placeholder="Task name"
                      value={newTaskName}
                    />
                    <div className="mt-1.5 flex gap-2">
                      <button className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={!newTaskName.trim() || creatingTask} onClick={createTaskFromTicket}>
                        {creatingTask ? 'Creating...' : 'Create'}
                      </button>
                      <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => { setShowCreateTask(false); setNewTaskName(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    onClick={() => { setShowCreateTask(true); setNewTaskName(ticket.title); }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Task from Ticket
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <NotesSection
              entityId={ticketId}
              entityType="ticket"
              isAdmin
              showCategories
              workspaceId={workspaceId}
            />
          )}

          {tab === 'activity' && (
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="py-4 text-center text-xs text-gray-400">No activity yet</p>
              )}
              {comments.map((c) => {
                const content = typeof c.content === 'string' ? c.content : (c.content as { text?: string })?.text ?? '';
                const isSystem = typeof c.content === 'object' && (c.content as { type?: string })?.type === 'system';
                return (
                  <div className={cn('rounded-lg px-3 py-2', isSystem ? 'bg-gray-50 dark:bg-gray-900' : 'border border-gray-200 dark:border-gray-800')} key={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.user.name ?? c.user.email}</span>
                      <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className={cn('mt-1 text-sm', isSystem ? 'italic text-gray-500' : 'text-gray-800 dark:text-gray-200')}>
                      {content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
