'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const AVAILABLE_VARIABLES = [
  '{{client_name}}',
  '{{client_email}}',
  '{{workspace_name}}',
  '{{service_name}}',
  '{{order_id}}',
  '{{total}}',
  '{{invoice_number}}',
  '{{invoice_url}}',
  '{{intake_url}}',
  '{{ticket_number}}',
  '{{ticket_subject}}',
  '{{reply_content}}',
  '{{due_date}}',
  '{{interval}}',
  '{{next_billing_date}}',
];

export default function EmailTemplateEditorPage() {
  const params = useParams();
  const slug = params.slug as string;
  const templateId = params.templateId as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchTemplate = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);
      const res = await fetch(`/api/workspaces/${ws.id}/email-templates/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setSubject(data.subject);
        setBody(data.body);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, templateId]);

  useEffect(() => { fetchTemplate(); }, [fetchTemplate]);

  async function handleSave() {
    if (!workspaceId) return;
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/workspaces/${workspaceId}/email-templates/${templateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, subject, body }),
    });
    setSaving(false);
    setMessage(res.ok ? 'Saved.' : 'Failed to save.');
  }

  if (loading) return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400" href={`/app/${slug}/settings/email-templates`}>
        <ArrowLeft className="h-4 w-4" /> Back to Templates
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{name.replace(/_/g, ' ')}</h1>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template Name</label>
          <input className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setName(e.target.value)} value={name} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
          <input className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setSubject(e.target.value)} value={subject} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Body</label>
          <textarea className="mt-1 h-48 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setBody(e.target.value)} value={body} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Available Variables</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {AVAILABLE_VARIABLES.map((v) => (
              <button className="rounded bg-white px-2 py-0.5 font-mono text-xs text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700" key={v} onClick={() => setBody((prev) => prev + v)} type="button">{v}</button>
            ))}
          </div>
        </div>
        {message && <p className="text-sm text-blue-600 dark:text-blue-400">{message}</p>}
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>
    </div>
  );
}
