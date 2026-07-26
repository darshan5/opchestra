'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, use, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

async function fetchInviteData(
  token: string,
): Promise<{ ok: boolean; email?: string; workspaceName?: string; error?: string }> {
  try {
    const res = await fetch(`/api/auth/invite?token=${token}`);
    const data = await res.json();
    if (res.ok) {
      return { email: data.email, ok: true, workspaceName: data.workspaceName };
    }
    return { error: data.error, ok: false };
  } catch {
    return { error: 'Something went wrong.', ok: false };
  }
}

function InviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invalid Invitation</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          No invitation token provided.
        </p>
        <Link
          className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          href="/login"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return <InviteForm token={token} />;
}

function InviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [promise] = useState(() => fetchInviteData(token));
  const inviteData = use(promise);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!inviteData.ok) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invalid Invitation</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{inviteData.error}</p>
        <Link
          className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          href="/login"
        >
          Go to login
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push('/login');
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        Join {inviteData.workspaceName}
      </h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        You&apos;ve been invited as <strong>{inviteData.email}</strong>
      </p>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="name"
          id="name"
          label="Your name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          required
          type="text"
          value={name}
        />
        <Input
          autoComplete="new-password"
          id="password"
          label="Create a password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          required
          type="password"
          value={password}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button className="w-full" loading={loading} type="submit">
          Accept invitation
        </Button>
      </form>
    </>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
