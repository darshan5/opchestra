'use client';

import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface CommentData {
  id: string;
  content: unknown;
  createdAt: string;
  user: { name: string | null; email: string };
}

interface TicketData {
  id: string;
  title: string;
  ticketNumber: string | null;
  status: string;
  priority: string;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  'Open': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  'Waiting on Customer': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  'Resolved': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  'Closed': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (typeof content === 'object' && content !== null && 'text' in content) {
    return String((content as Record<string, unknown>).text);
  }
  if (typeof content === 'object' && content !== null && 'content' in content) {
    const arr = (content as { content: Array<{ text?: string }> }).content;
    if (Array.isArray(arr)) return arr.map((n) => n.text ?? '').join('');
  }
  return JSON.stringify(content);
}

export default function PortalTicketDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const ticketId = params.ticketId as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const tRes = await fetch(`/api/workspaces/${ws.id}/tasks/${ticketId}`);
      if (tRes.ok) setTicket(await tRes.json());

      const cRes = await fetch(`/api/workspaces/${ws.id}/tasks/${ticketId}/comments`);
      if (cRes.ok) setComments(await cRes.json());
    } finally {
      setLoading(false);
    }
  }, [slug, ticketId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !workspaceId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: reply.trim() }] }] } }),
      });
      if (res.ok) {
        setReply('');
        fetchData();
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  if (!ticket) {
    return <div className="p-6"><p className="text-gray-500">Ticket not found.</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400" href={`/portal/${slug}/tickets`}>
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      <div className="mt-4">
        <div className="flex items-start justify-between">
          <div>
            {ticket.ticketNumber && (
              <span className="text-xs font-mono text-gray-400">{ticket.ticketNumber}</span>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{ticket.title}</h1>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[ticket.status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
            {ticket.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Opened {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Conversation</h2>

        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No replies yet.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => {
              const isSystem = typeof c.content === 'object' && c.content !== null && 'type' in c.content && (c.content as Record<string, unknown>).type === 'system';
              if (isSystem) return null;
              return (
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" key={c.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {c.user.name ?? c.user.email}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {extractText(c.content)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <form className="flex gap-2" onSubmit={handleReply}>
          <textarea
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            value={reply}
          />
          <button
            className="self-end rounded-lg bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={sending || !reply.trim()}
            type="submit"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
