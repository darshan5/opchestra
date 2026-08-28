'use client';

import { formatDistanceToNow } from 'date-fns';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Template {
  id: string;
  name: string;
  subject: string;
  updatedAt: string;
}

export default function EmailTemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);
      const res = await fetch(`/api/workspaces/${ws.id}/email-templates`);
      if (res.ok) setTemplates(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || !workspaceId) return;
    const res = await fetch(`/api/workspaces/${workspaceId}/email-templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), subject: subject.trim(), body: '' }),
    });
    if (res.ok) {
      const t = await res.json();
      router.push(`/app/${slug}/settings/email-templates/${t.id}`);
    }
  }

  if (loading) return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Customize transactional email templates.</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {showAdd && (
        <form className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" onSubmit={handleAdd}>
          <div className="grid grid-cols-2 gap-3">
            <input autoFocus className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setName(e.target.value)} placeholder="Template name *" value={name} />
            <input className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setSubject(e.target.value)} placeholder="Subject line *" value={subject} />
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" type="submit">Create</button>
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300" onClick={() => setShowAdd(false)} type="button">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Subject</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
            {templates.map((t) => (
              <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" key={t.id} onClick={() => router.push(`/app/${slug}/settings/email-templates/${t.id}`)}>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.name.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.subject}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
