'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PortalProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setName(data.user.name ?? '');
          setEmail(data.user.email ?? '');
        }
      });
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      if (res.ok) {
        setMessage('Profile updated.');
        setCurrentPassword('');
        setNewPassword('');
        router.refresh();
      } else {
        const data = await res.json();
        setMessage(data.error ?? 'Failed to update.');
      }
    } catch {
      setMessage('Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>

      <div className="mt-6 max-w-lg">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{name || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{email || '—'}</p>
            </div>
          </div>

          <form className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-800" onSubmit={handleSaveProfile}>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Change Password</h2>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                type="password"
                value={currentPassword}
              />
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                type="password"
                value={newPassword}
              />
            </div>
            {message && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
            )}
            <button
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={saving || (!currentPassword && !newPassword)}
              type="submit"
            >
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
