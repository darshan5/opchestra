'use client';

import { formatDistanceToNow } from 'date-fns';
import { Plus, Trash2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Client {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export default function ClientManagementPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const fetchClients = useCallback(async () => {
    try {
      const wsRes = await fetch(`/api/workspaces`);
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/clients`);
      if (res.ok) {
        setClients(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !workspaceId) return;
    setAdding(true);
    setError('');

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          password: password || undefined,
        }),
      });

      if (res.ok) {
        setEmail('');
        setName('');
        setPassword('');
        setShowAdd(false);
        fetchClients();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to add client.');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/clients/${userId}`, {
      method: 'DELETE',
    });
    fetchClients();
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage client accounts for the portal.
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      {showAdd && (
        <form
          className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          onSubmit={handleAdd}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Add Client</h2>
            <button
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setShowAdd(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              autoFocus
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email *"
              required
              type="email"
              value={email}
            />
            <input
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              value={name}
            />
            <input
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (auto-generated)"
              type="password"
              value={password}
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={adding}
            type="submit"
          >
            {adding ? 'Adding...' : 'Add Client'}
          </button>
        </form>
      )}

      {clients.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No clients yet. Add one to give them portal access.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Name</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Added</th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-950">
              {clients.map((client) => (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" key={client.id}>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {client.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{client.email}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(client.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => handleRemove(client.userId)}
                      title="Remove client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
