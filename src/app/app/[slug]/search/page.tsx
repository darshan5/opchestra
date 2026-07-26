'use client';

import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  project: { name: string } | null;
  assignee: { name: string | null; email: string } | null;
  updatedAt: string;
}

export default function SearchPage() {
  const params = useParams<{ slug: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const workspaceIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          workspaceIdRef.current = ws.id;
        }
      });
  }, [params.slug]);

  const search = useCallback(async (q: string) => {
    const wsId = workspaceIdRef.current;
    if (!q.trim() || !wsId) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${wsId}/tasks?search=${encodeURIComponent(q.trim())}`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
  }

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          className="flex-1 bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white dark:placeholder-gray-500"
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search tasks..."
          ref={inputRef}
          type="text"
          value={query}
        />
        {loading && (
          <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              fill="currentColor"
            />
          </svg>
        )}
      </div>

      {query.trim() && (
        <div className="mt-4 space-y-1">
          {results.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No tasks found for &quot;{query}&quot;
            </p>
          )}
          {results.map((task) => (
            <div
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
              key={task.id}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {task.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {task.project?.name ?? 'No project'} &middot;{' '}
                  {task.assignee?.name ?? task.assignee?.email ?? 'Unassigned'}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    task.status === 'Done'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : task.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                  )}
                >
                  {task.status}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
