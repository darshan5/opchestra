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
  role: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('ADMIN');
  const [creating, setCreating] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
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
        role: data.role || newRole,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewEmail('');
    setNewName('');
    setNewRole('ADMIN');
    setCreating(false);
  }

  async function deleteAdmin(id: string) {
    const res = await fetch(`/api/admin/admin-users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAdmins((prev) => prev.filter((a) => a.id !== id));
    }
    setDeleteConfirmId(null);
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
            <div className="space-y-1">
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="admin-role"
              >
                Role
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                id="admin-role"
                onChange={(e) => setNewRole(e.target.value)}
                value={newRole}
              >
                <option value="VIEWER">Viewer (read-only dashboard)</option>
                <option value="SUPPORT">Support (read-only users & logs)</option>
                <option value="ADMIN">Admin (manage users & settings)</option>
                <option value="SUPER_ADMIN">Super Admin (full access)</option>
              </select>
            </div>
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
                Role
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Last Login
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
                <td className="px-4 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      admin.role === 'SUPER_ADMIN'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : admin.role === 'ADMIN'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : admin.role === 'SUPPORT'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {admin.role}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {admin.lastLoginAt
                    ? formatDistanceToNow(new Date(admin.lastLoginAt), { addSuffix: true })
                    : 'Never'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(admin.createdAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-2.5">
                  {deleteConfirmId === admin.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600 dark:text-red-400">Remove?</span>
                      <button className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400" onClick={() => deleteAdmin(admin.id)}>Yes</button>
                      <button className="text-xs text-gray-500" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      onClick={() => setDeleteConfirmId(admin.id)}
                      title="Remove admin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
