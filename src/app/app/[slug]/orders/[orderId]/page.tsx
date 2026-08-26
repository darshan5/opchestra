'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Lock, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface OrderDetail {
  id: string;
  status: string;
  priority: number;
  quantity: number;
  totalPrice: number;
  intakeComplete: boolean;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  notes: string | null;
  service: { id: string; name: string; price: number } | null;
  client: { id: string; name: string | null; email: string } | null;
  assignee: { id: string; name: string | null } | null;
  variant: { name: string; price: number } | null;
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
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  SUBMITTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  WORKING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  COMPLETE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  CANCELED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUSES = ['PENDING', 'SUBMITTED', 'WORKING', 'COMPLETE', 'CANCELED'];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orderId = params.orderId as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<OrderTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [teamOnly, setTeamOnly] = useState(false);
  const [sending, setSending] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const fetchOrder = useCallback(async () => {
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
      if (mRes.ok) setMessages(await mRes.json());
      if (tRes.ok) setTasks(await tRes.json());
    } finally {
      setLoading(false);
    }
  }, [slug, orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  async function changeStatus(status: string) {
    if (!workspaceId) return;
    setShowStatusMenu(false);
    await fetch(`/api/workspaces/${workspaceId}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchOrder();
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !workspaceId) return;
    setSending(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim(), teamOnly }),
      });
      setNewMessage('');
      setTeamOnly(false);
      const mRes = await fetch(`/api/workspaces/${workspaceId}/orders/${orderId}/messages`);
      if (mRes.ok) setMessages(await mRes.json());
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
        href={`/app/${slug}/orders`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {order.service?.name ?? 'Order'}
        </h1>
        <div className="relative">
          <button
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[order.status] ?? ''}`}
            onClick={() => setShowStatusMenu(!showStatusMenu)}
          >
            {order.status}
          </button>
          {showStatusMenu && (
            <div className="absolute top-8 left-0 z-10 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {STATUSES.map((s) => (
                <button
                  className="block w-full px-4 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  key={s}
                  onClick={() => changeStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Client: {order.client?.name || order.client?.email || '—'}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          ${order.totalPrice.toFixed(2)}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Messages — left 2/3 */}
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
                  <div
                    className={cn('px-4 py-3', msg.teamOnly && 'bg-amber-50/50 dark:bg-amber-900/10')}
                    key={msg.id}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {msg.author.name || msg.author.email}
                      </span>
                      {msg.teamOnly && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                          <Lock className="h-3 w-3" />
                          Internal
                        </span>
                      )}
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
                placeholder="Write a message..."
                rows={3}
                value={newMessage}
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    checked={teamOnly}
                    className="h-4 w-4 rounded border-gray-300 text-amber-600"
                    onChange={(e) => setTeamOnly(e.target.checked)}
                    type="checkbox"
                  />
                  Internal note
                </label>
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

        {/* Right sidebar — 1/3 */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Details</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Service</span>
                <span className="text-gray-900 dark:text-white">{order.service?.name}</span>
              </div>
              {order.variant && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Variant</span>
                  <span className="text-gray-900 dark:text-white">{order.variant.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Quantity</span>
                <span className="text-gray-900 dark:text-white">{order.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Total</span>
                <span className="font-medium text-gray-900 dark:text-white">${order.totalPrice.toFixed(2)}</span>
              </div>
              {order.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Due</span>
                  <span className="text-gray-900 dark:text-white">{format(new Date(order.dueDate), 'MMM d, yyyy')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-gray-900 dark:text-white">{format(new Date(order.createdAt), 'MMM d, yyyy')}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Tasks</h3>
            {tasks.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No tasks linked.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {tasks.map((task) => (
                  <Link
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    href={`/app/${slug}/all-tasks?task=${task.id}`}
                    key={task.id}
                    target="_blank"
                  >
                    {task.completedAt ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
                    )}
                    <span className={cn('truncate', task.completedAt && 'text-gray-400 line-through')}>
                      {task.title}
                    </span>
                    <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-gray-300" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-xs font-semibold text-gray-400 uppercase">Intake</h3>
            <div className="mt-2 flex items-center gap-2">
              {order.intakeComplete ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700 dark:text-green-400">Complete</span>
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-400">Pending</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
