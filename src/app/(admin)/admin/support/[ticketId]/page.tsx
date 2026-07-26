'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  isAdmin: boolean;
  adminUserEmail: string | null;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  messages: Message[];
}

export default function TicketDetailPage() {
  const params = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/admin/support/${params.ticketId}`)
      .then((r) => r.json())
      .then((t) => {
        setTicket(t);
        setLoading(false);
      });
  }, [params.ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReply() {
    if (!reply.trim()) {
      return;
    }
    setSending(true);
    await fetch(`/api/admin/support/${params.ticketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: reply.trim() }),
    });
    setReply('');
    setSending(false);
    load();
  }

  async function updateStatus(status: string) {
    await fetch(`/api/admin/support/${params.ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function updatePriority(priority: string) {
    await fetch(`/api/admin/support/${params.ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    });
    load();
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Ticket not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <Link
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          href="/admin/support"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ticket.subject}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            From {ticket.user.name ?? ticket.user.email} ({ticket.user.email}) &middot;{' '}
            {ticket.category} &middot; {new Date(ticket.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
          <select
            className="block rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            onChange={(e) => updateStatus(e.target.value)}
            value={ticket.status}
          >
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Priority</label>
          <select
            className="block rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            onChange={(e) => updatePriority(e.target.value)}
            value={ticket.priority}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {ticket.messages.map((msg) => (
          <div
            className={cn(
              'rounded-xl border px-4 py-3',
              msg.isAdmin
                ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900',
            )}
            key={msg.id}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {msg.isAdmin ? (msg.adminUserEmail ?? 'Admin') : (ticket.user.name ?? 'User')}
              </span>
              {msg.isAdmin && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                  Staff
                </span>
              )}
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                {new Date(msg.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {msg.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Reply as Staff</h3>
        <textarea
          className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply..."
          rows={4}
          value={reply}
        />
        <div className="mt-2">
          <Button disabled={!reply.trim() || sending} loading={sending} onClick={handleReply}>
            {sending ? 'Sending...' : 'Send Reply'}
          </Button>
        </div>
      </div>
    </div>
  );
}
