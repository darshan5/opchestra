'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, CheckCircle2, Circle, ClipboardList, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface OrderDetail {
  id: string;
  status: string;
  totalPrice: number;
  intakeComplete: boolean;
  dueDate: string | null;
  createdAt: string;
  service: { name: string } | null;
}

interface Message {
  id: string;
  content: string;
  teamOnly: boolean;
  createdAt: string;
  author: { name: string | null; email: string };
}

interface OrderTask {
  id: string;
  title: string;
  status: string;
  completedAt: string | null;
  visibleToClient?: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  WORKING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  COMPLETE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  CANCELED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function PortalOrderDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const orderId = params.orderId as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<OrderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const [oRes, mRes, tRes] = await Promise.all([
        fetch(`/api/workspaces/${ws.id}/orders/${orderId}`),
        fetch(`/api/workspaces/${ws.id}/orders/${orderId}/messages`),
        fetch(`/api/workspaces/${ws.id}/orders/${orderId}/tasks`),
      ]);
      if (oRes.ok) setOrder(await oRes.json());
      if (mRes.ok) {
        const allMsgs: Message[] = await mRes.json();
        setMessages(allMsgs.filter((m) => !m.teamOnly));
      }
      if (tRes.ok) setTasks(await tRes.json());
    } finally {
      setLoading(false);
    }
  }, [slug, orderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !workspaceId) return;
    setSending(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim(), teamOnly: false }),
      });
      setNewMessage('');
      const mRes = await fetch(`/api/workspaces/${workspaceId}/orders/${orderId}/messages`);
      if (mRes.ok) {
        const allMsgs: Message[] = await mRes.json();
        setMessages(allMsgs.filter((m) => !m.teamOnly));
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  if (!order) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Order not found.</p></div>;
  }

  return (
    <div className="p-6">
      <Link
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        href={`/portal/${slug}/orders`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {order.service?.name ?? 'Order'}
        </h1>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[order.status] ?? ''}`}>
          {order.status}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          ${order.totalPrice.toFixed(2)}
        </span>
        {order.dueDate && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Due {format(new Date(order.dueDate), 'MMM d, yyyy')}
          </span>
        )}
      </div>

      {!order.intakeComplete && order.status === 'PENDING' && (
        <Link
          className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          href={`/portal/${slug}/orders/${orderId}/intake`}
        >
          <ClipboardList className="h-4 w-4" />
          Complete Intake Form
        </Link>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Messages */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Messages</h2>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {messages.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-gray-400">No messages yet.</p>
              ) : (
                messages.map((msg) => (
                  <div className="px-4 py-3" key={msg.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {msg.author.name || msg.author.email}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>
            <form className="border-t border-gray-200 p-4 dark:border-gray-800" onSubmit={sendMessage}>
              <textarea
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                value={newMessage}
              />
              <div className="mt-2 flex justify-end">
                <button
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={sending || !newMessage.trim()}
                  type="submit"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Tasks */}
        <div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Progress</h3>
            {tasks.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No tasks yet.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {tasks.map((task) => (
                  <div className="flex items-center gap-2 py-1" key={task.id}>
                    {task.completedAt ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
                    )}
                    <span
                      className={cn(
                        'text-sm truncate',
                        task.completedAt
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900 dark:text-white',
                      )}
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
