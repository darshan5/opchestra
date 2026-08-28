'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
}

export default function PortalPagesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [pages, setPages] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');

  const fetchPages = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);
      const res = await fetch(`/api/workspaces/${ws.id}/portal-pages`);
      if (res.ok) setPages(await res.json());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !workspaceId) return;
    const res = await fetch(`/api/workspaces/${workspaceId}/portal-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), slug: pageSlug.trim() || undefined }),
    });
    if (res.ok) {
      const page = await res.json();
      router.push(`/app/${slug}/settings/portal-pages/${page.id}`);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/workspaces/${workspaceId}/portal-pages/${id}`, { method: 'DELETE' });
    fetchPages();
  }

  async function togglePublished(id: string, published: boolean) {
    await fetch(`/api/workspaces/${workspaceId}/portal-pages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !published }),
    });
    fetchPages();
  }

  if (loading) return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portal Pages</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Custom pages visible in the client portal.</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> New Page
        </button>
      </div>

      {showAdd && (
        <form className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" onSubmit={handleAdd}>
          <div className="grid grid-cols-2 gap-3">
            <input autoFocus className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setTitle(e.target.value)} placeholder="Page title *" value={title} />
            <input className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setPageSlug(e.target.value)} placeholder="Slug (auto-generated)" value={pageSlug} />
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" type="submit">Create</button>
            <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300" onClick={() => setShowAdd(false)} type="button">Cancel</button>
          </div>
        </form>
      )}

      {pages.length === 0 ? (
        <div className="mt-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No custom pages yet.</p></div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Title</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Published</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {pages.map((p) => (
                <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" key={p.id} onClick={() => router.push(`/app/${slug}/settings/portal-pages/${p.id}`)}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">/{p.slug}</td>
                  <td className="px-4 py-3">
                    <button className={`relative h-5 w-9 rounded-full transition-colors ${p.published ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`} onClick={(e) => { e.stopPropagation(); togglePublished(p.id, p.published); }}>
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow ${p.published ? 'translate-x-4' : ''}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
