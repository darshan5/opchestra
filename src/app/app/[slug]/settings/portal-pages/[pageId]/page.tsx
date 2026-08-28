'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function PortalPageEditorPage() {
  const params = useParams();
  const slug = params.slug as string;
  const pageId = params.pageId as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [title, setTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPage = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);
      const res = await fetch(`/api/workspaces/${ws.id}/portal-pages/${pageId}`);
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title);
        setPageSlug(data.slug);
        setContent(data.content);
        setPublished(data.published);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, pageId]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  async function handleSave() {
    if (!workspaceId) return;
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/workspaces/${workspaceId}/portal-pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, slug: pageSlug, content, published }),
    });
    setSaving(false);
    setMessage(res.ok ? 'Saved.' : 'Failed to save.');
  }

  if (loading) return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;

  return (
    <div className="p-6">
      <Link className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400" href={`/app/${slug}/settings/portal-pages`}>
        <ArrowLeft className="h-4 w-4" /> Back to Pages
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
            <input className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setTitle(e.target.value)} value={title} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</label>
            <input className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setPageSlug(e.target.value)} value={pageSlug} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content (HTML)</label>
            <textarea className="mt-1 h-64 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setContent(e.target.value)} value={content} />
          </div>
          <div className="flex items-center gap-3">
            <button className={`relative h-6 w-11 rounded-full transition-colors ${published ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`} onClick={() => setPublished(!published)} type="button">
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow ${published ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">Published</span>
          </div>
          {message && <p className="text-sm text-blue-600 dark:text-blue-400">{message}</p>}
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50" disabled={saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Save Page'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
          <div className="mt-1 min-h-[300px] rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: content }} />
          </div>
        </div>
      </div>
    </div>
  );
}
