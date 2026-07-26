'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (token) {
    return <NewPasswordForm token={token} />;
  }
  return <RequestResetForm />;
}

function RequestResetForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Check your email</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          If an account exists for <strong>{email}</strong>, we sent a password reset link.
        </p>
        <Link
          className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          href="/login"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">Reset password</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          id="email"
          label="Email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          type="email"
          value={email}
        />
        <Button className="w-full" loading={loading} type="submit">
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        <Link className="text-blue-600 hover:underline dark:text-blue-400" href="/login">
          Back to login
        </Link>
      </p>
    </>
  );
}

function NewPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Password reset</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Your password has been updated.
        </p>
        <Link
          className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
          href="/login"
        >
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">Set new password</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="new-password"
          id="password"
          label="New password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          required
          type="password"
          value={password}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button className="w-full" loading={loading} type="submit">
          Reset password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
