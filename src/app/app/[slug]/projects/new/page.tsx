'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NewProjectPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const workspaceRes = await fetch('/api/workspaces');
      const workspaces = await workspaceRes.json();
      const workspace = workspaces.find((w: { slug: string }) => w.slug === params.slug);

      if (!workspace) {
        setError('Workspace not found');
        return;
      }

      const res = await fetch(`/api/workspaces/${workspace.id}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push(`/app/${params.slug}/projects/${data.id}`);
      router.refresh();
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Project</h1>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <Input
          id="name"
          label="Project name"
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Website Redesign"
          required
          type="text"
          value={name}
        />
        <div className="space-y-1">
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            htmlFor="description"
          >
            Description (optional)
          </label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            id="description"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            rows={3}
            value={description}
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-3">
          <Button loading={loading} type="submit">
            Create project
          </Button>
          <Button onClick={() => router.back()} type="button" variant="ghost">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
