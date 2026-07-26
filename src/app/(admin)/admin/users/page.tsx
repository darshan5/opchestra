'use client';

import { format } from 'date-fns';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Subscriber {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    _count: { members: number; tasks: number };
  };
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadSubscribers = useCallback(async (q?: string) => {
    setLoading(true);
    const url = q ? `/api/admin/users?search=${encodeURIComponent(q)}` : '/api/admin/users';
    const res = await fetch(url);
    if (res.ok) {
      setSubscribers(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSubscribers();
  }, [loadSubscribers]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => loadSubscribers(value), 300);
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscribers</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage workspace owners
      </p>

      <div className="mt-6 flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-9 text-sm text-gray-900 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email..."
            type="text"
            value={search}
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Workspace
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Plan
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Members
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Tasks
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Signed Up
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {subscribers.map((sub) => (
                <tr
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                  key={sub.id}
                >
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                    {sub.user.name ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {sub.user.email}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      href={`/admin/workspaces/${sub.workspace.id}`}
                    >
                      {sub.workspace.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                      Free
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {sub.workspace._count.members}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {sub.workspace._count.tasks}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(sub.user.createdAt), 'M/d/yyyy')}
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={7}>
                    No subscribers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {subscribers.length} subscribers total
        </p>
      </div>
    </div>
  );
}
