'use client';

import { formatDistanceToNow } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/admin-users')
      .then((r) => r.json())
      .then(setAdmins)
      .finally(() => setLoading(false));
  }, []);

  async function createAdmin() {
    setCreating(true);
    setError('');
    setTempPassword(null);

    const res = await fetch('/api/admin/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, name: newName }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      setCreating(false);
      return;
    }

    if (data.tempPassword) {
      setTempPassword(data.tempPassword);
    }

    setAdmins((prev) => [
      ...prev,
      {
        id: data.id,
        email: data.email || newEmail,
        name: newName,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewEmail('');
    setNewName('');
    setCreating(false);
  }

  async function deleteAdmin(id: string) {
    if (!window.confirm('Remove this admin?')) {
      return;
    }

    const res = await fetch(`/api/admin/admin-users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Users</h1>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Admin
        </Button>
      </div>

      {showCreate && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Create Admin User</h3>
          <div className="mt-3 space-y-3">
            <Input
              id="admin-name"
              label="Name"
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Jane Smith"
              type="text"
              value={newName}
            />
            <Input
              id="admin-email"
              label="Email"
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="admin@company.com"
              type="email"
              value={newEmail}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {tempPassword && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Admin created! Temporary password:
                </p>
                <code className="mt-1 block rounded bg-green-100 px-2 py-1 font-mono text-sm text-green-900 dark:bg-green-900 dark:text-green-100">
                  {tempPassword}
                </code>
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Share this with the user. They will be asked to change it on first login.
                </p>
              </div>
            )}
            <Button
              disabled={!newEmail || !newName}
              loading={creating}
              onClick={createAdmin}
              size="sm"
            >
              Create
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
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
                Created
              </th>
              <th className="w-16 px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                  {admin.name || '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {admin.email}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(admin.createdAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    onClick={() => deleteAdmin(admin.id)}
                    title="Remove admin"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
