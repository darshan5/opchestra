'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface ProvisionResult {
  id: string;
  email: string;
  name: string | null;
  password: string;
  workspaceId: string | null;
  message: string;
}

export default function ProvisioningPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [autoPassword, setAutoPassword] = useState(true);
  const [workspaceId, setWorkspaceId] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ProvisionResult | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    const res = await fetch('/api/admin/workspaces');
    if (res.ok) {
      setWorkspaces(await res.json());
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const res = await fetch('/api/admin/provisioning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: name || undefined,
        password: autoPassword ? undefined : password,
        workspaceId: workspaceId || undefined,
        role: workspaceId ? role : undefined,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setResult(data);
    } else {
      setError(data.error);
    }
    setLoading(false);
  }

  function reset() {
    setEmail('');
    setName('');
    setPassword('');
    setAutoPassword(true);
    setWorkspaceId('');
    setRole('MEMBER');
    setResult(null);
    setError('');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Provisioning</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manually create a user account and optionally assign to a workspace.
      </p>

      {result ? (
        <div className="mt-6 max-w-lg rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-200">
            User Provisioned
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Email:</strong> {result.email}
            </p>
            {result.name && (
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Name:</strong> {result.name}
              </p>
            )}
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Password:</strong>{' '}
              <code className="rounded bg-gray-100 px-2 py-0.5 font-mono dark:bg-gray-800">
                {result.password}
              </code>
            </p>
            {result.workspaceId && (
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Workspace:</strong>{' '}
                {workspaces.find((w) => w.id === result.workspaceId)?.name || result.workspaceId}
              </p>
            )}
          </div>
          <p className="mt-4 text-xs text-orange-600 dark:text-orange-400">
            Save these credentials — the password won&apos;t be shown again.
            {autoPassword && ' User will be required to change password on first login.'}
          </p>
          <Button className="mt-4" onClick={reset}>
            Provision Another
          </Button>
        </div>
      ) : (
        <form className="mt-6 max-w-lg space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">User Details</h2>
            <div className="space-y-4">
              <Input
                id="email"
                label="Email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                type="email"
                value={email}
              />
              <Input
                id="name"
                label="Name (optional)"
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                type="text"
                value={name}
              />
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    checked={autoPassword}
                    className="h-4 w-4 rounded border-gray-300"
                    onChange={(e) => setAutoPassword(e.target.checked)}
                    type="checkbox"
                  />
                  Auto-generate password (user must change on first login)
                </label>
                {!autoPassword && (
                  <Input
                    id="password"
                    label="Password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars"
                    required
                    type="text"
                    value={password}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">
              Workspace Assignment (optional)
            </h2>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Workspace
                </label>
                <select
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  value={workspaceId}
                >
                  <option value="">None</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name} ({ws.slug})
                    </option>
                  ))}
                </select>
              </div>
              {workspaceId && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role in Workspace
                  </label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                    onChange={(e) => setRole(e.target.value)}
                    value={role}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </p>
          )}

          <Button disabled={!email} loading={loading} type="submit">
            Provision User
          </Button>
        </form>
      )}
    </div>
  );
}
