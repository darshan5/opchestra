'use client';

import { formatDistanceToNow } from 'date-fns';
import { Inbox } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  source: string | null;
  createdAt: string;
  contact: { name: string; email: string | null } | null;
  ticketCompany: { name: string } | null;
}

interface Member {
  id: string;
  name: string | null;
  email: string;
}

const priorityColors: Record<string, string> = {
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  LOW: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function TicketInboxPage() {
  const params = useParams<{ slug: string }>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((wss) => {
        const ws = wss.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          Promise.all([
            fetch(`/api/workspaces/${ws.id}/tickets/inbox`).then((r) => r.json()),
            fetch(`/api/workspaces/${ws.id}/members`).then((r) => r.json()),
          ]).then(([t, m]) => {
            setTickets(Array.isArray(t) ? t : []);
            setMembers(
              Array.isArray(m) ? m.map((mb: { user: Member }) => mb.user) : [],
            );
            setLoading(false);
          });
        }
      });
  }, [params.slug]);

  async function assignTicket(ticketId: string, assigneeId: string) {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId }),
    });
    if (res.ok) {
      setTickets(tickets.filter((t) => t.id !== ticketId));
    }
  }

  async function closeTicket(ticketId: string) {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Closed' }),
    });
    if (res.ok) {
      setTickets(tickets.filter((t) => t.id !== ticketId));
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading inbox...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2">
        <Inbox className="h-6 w-6 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket Inbox</h1>
        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          {tickets.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Unassigned tickets waiting for triage
      </p>

      {tickets.length === 0 ? (
        <div className="mt-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Inbox is empty</p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {tickets.map((ticket) => (
            <div
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
              key={ticket.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {ticket.title}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[ticket.priority] ?? ''}`}
                  >
                    {ticket.priority}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {ticket.contact && (
                    <span>{ticket.contact.name} ({ticket.contact.email})</span>
                  )}
                  {ticket.source && <span>via {ticket.source}</span>}
                  <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <select
                  className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      assignTicket(ticket.id, e.target.value);
                    }
                  }}
                >
                  <option value="">Assign to...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name ?? m.email}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  onClick={() => closeTicket(ticket.id)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Public Submission Form</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Share this URL with customers to submit tickets:
        </p>
        <code className="mt-2 block rounded bg-gray-100 px-3 py-2 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
          {typeof window !== 'undefined' ? window.location.origin : ''}/submit/{params.slug}
        </code>
      </div>
    </div>
  );
}
