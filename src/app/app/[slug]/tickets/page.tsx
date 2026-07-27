'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { Plus, Ticket } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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
  const remaining = dueMs - now;
  if (remaining < 3600000) return 'warning';
  return 'ok';
}

const slaColors: Record<string, string> = {
  breached: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  ok: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

const statusTabs = ['All', 'Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'];
const priorityColors: Record<string, string> = {
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function TicketsPage() {
  const params = useParams<{ slug: string }>();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [workspaceId, setWorkspaceId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [contacts, setContacts] = useState<ContactData[]>([]);

  // Create form state
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
        if (w) {
          setWorkspaceId(w.id);
        }
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
    if (res.ok) {
      setTickets(await res.json());
    }
  }, [workspaceId, activeTab]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function createTicket() {
    if (!subject.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        description: description || undefined,
        priority,
        assigneeId: assigneeId || undefined,
        contactId: contactId || undefined,
        source: 'Manual',
      }),
    });
    if (res.ok) {
      setSubject('');
      setDescription('');
      setPriority('MEDIUM');
      setAssigneeId('');
      setContactId('');
      setShowCreate(false);
      loadTickets();
    }
    setSaving(false);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tickets</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage support and service tickets
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {showCreate && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="subject"
              label="Subject"
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of the issue"
              required
              value={subject}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                onChange={(e) => setPriority(e.target.value)}
                value={priority}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the issue..."
              rows={3}
              value={description}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsible Person</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                onChange={(e) => setAssigneeId(e.target.value)}
                value={assigneeId}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact</label>
              <select
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                onChange={(e) => setContactId(e.target.value)}
                value={contactId}
              >
                <option value="">No contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={saving} onClick={createTicket} size="sm">Create Ticket</Button>
            <Button onClick={() => setShowCreate(false)} size="sm" variant="ghost">Cancel</Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1">
        {statusTabs.map((tab) => (
          <button
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              activeTab === tab
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
            )}
            key={tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {tickets.map((ticket) => (
          <div
            className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
            key={ticket.id}
            onClick={() => setSelectedTicketId(ticket.id)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-gray-400" />
                <span className="font-mono text-xs text-gray-400">{ticket.ticketNumber}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{ticket.title}</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {ticket.contact?.name ?? 'No contact'}
                {ticket.ticketCompany ? ` · ${ticket.ticketCompany.name}` : ''}
                {ticket.assignee ? ` · ${ticket.assignee.name ?? ticket.assignee.email}` : ''}
                {' · '}
                {format(new Date(ticket.createdAt), 'MMM d')}
              </p>
            </div>
            <div className="ml-4 flex items-center gap-2">
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', priorityColors[ticket.priority] ?? 'bg-gray-100 text-gray-600')}>
                {ticket.priority.toLowerCase()}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {ticket.status}
              </span>
              {(() => {
                const sla = getSlaStatus(ticket.slaResolutionDue);
                if (!sla || ticket.status === 'Closed' || ticket.status === 'Resolved') return null;
                return (
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', slaColors[sla])}>
                    SLA {sla === 'breached' ? 'Breached' : sla === 'warning' ? 'At Risk' : 'OK'}
                  </span>
                );
              })()}
            </div>
          </div>
        ))}
        {tickets.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No tickets yet</p>
        )}
      </div>

      {selectedTicketId && workspaceId && (
        <TicketDetailPanel
          members={members}
          onClose={() => setSelectedTicketId(null)}
          onUpdate={loadTickets}
          ticketId={selectedTicketId}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
