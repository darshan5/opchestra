'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null; image: string | null };
}

export default function WorkspaceSettingsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
          fetchMembers(ws.id);
        }
        setLoading(false);
      });
  }, [params.slug]);

  async function fetchMembers(wid: string) {
    const res = await fetch(`/api/workspaces/${wid}/members`);
    if (res.ok) {
      setMembers(await res.json());
    }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !inviteEmail.trim()) {
      return;
    }
    setInviting(true);
    setMessage('');

    const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } else {
      setMessage(data.error || 'Failed to invite');
    }
    setInviting(false);
  }

  async function changeRole(memberId: string, role: string) {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    });
    if (res.ok) {
      fetchMembers(workspaceId);
    } else {
      const data = await res.json();
      setMessage(data.error || 'Failed to change role');
    }
  }

  async function removeMember(memberId: string, email: string) {
    if (!workspaceId || !confirm(`Remove ${email} from this workspace?`)) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    if (res.ok) {
      fetchMembers(workspaceId);
      setMessage(`${email} removed`);
    } else {
      const data = await res.json();
      setMessage(data.error || 'Failed to remove');
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
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workspace Settings</h1>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      {/* Invite */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Member</h2>
        <form className="mt-3 flex gap-2" onSubmit={inviteMember}>
          <Input
            className="flex-1"
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            required
            type="email"
            value={inviteEmail}
          />
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            onChange={(e) => setInviteRole(e.target.value)}
            value={inviteRole}
          >
            <option value="MEMBER">Member</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <Button loading={inviting} type="submit">
            Invite
          </Button>
        </form>
      </section>

      {/* Members */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Members ({members.length})
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                    {m.user.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {m.user.email}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded border-0 bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300"
                      disabled={m.role === 'SUPER_ADMIN'}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                      value={m.role}
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {m.role !== 'SUPER_ADMIN' && (
                      <button
                        className="text-xs text-red-600 hover:underline dark:text-red-400"
                        onClick={() => removeMember(m.id, m.user.email)}
                        type="button"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6">
        <Button onClick={() => router.back()} variant="ghost">
          Back
        </Button>
      </div>
    </div>
  );
}
