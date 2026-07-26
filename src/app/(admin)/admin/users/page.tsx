'use client';

import { format } from 'date-fns';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AppUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: string | null;
  createdAt: string;
  _count: { memberships: number; createdTasks: number };
}

export default function AppUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadUsers = useCallback(async (q?: string) => {
    setLoading(true);
    const url = q ? `/api/admin/users?search=${encodeURIComponent(q)}` : '/api/admin/users';
    const res = await fetch(url);
    if (res.ok) {
      setUsers(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => loadUsers(value), 300);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">App Users</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        All registered workspace users
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
                  Workspaces
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Tasks
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.map((user) => (
                <tr
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                  key={user.id}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      href={`/admin/users/${user.id}`}
                    >
                      {user.name ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {user._count.memberships}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {user._count.createdTasks}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(user.createdAt), 'M/d/yyyy')}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={5}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{users.length} users total</p>
      </div>
    </div>
  );
}
