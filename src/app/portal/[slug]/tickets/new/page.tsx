'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function PortalNewTicketPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const init = useCallback(async () => {
    const wsRes = await fetch('/api/workspaces');
    const workspaces = await wsRes.json();
    const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
    if (ws) setWorkspaceId(ws.id);
  }, [slug]);

  useEffect(() => { init(); }, [init]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !workspaceId) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
        }),
      });

      if (res.ok) {
        const ticket = await res.json();
        router.push(`/portal/${slug}/tickets/${ticket.id}`);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to create ticket.');
      }
    } catch {
      setError('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400" href={`/portal/${slug}/tickets`}>
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">New Ticket</h1>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
          <input
            autoFocus
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Briefly describe the issue"
            required
            value={title}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide more details..."
            rows={5}
            value={description}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            onChange={(e) => setPriority(e.target.value)}
            value={priority}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={submitting}
          type="submit"
        >
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
