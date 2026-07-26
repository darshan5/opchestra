'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push('/app');
    } catch {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        Change your password
      </h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        You must set a new password before continuing.
      </p>
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
        <Input
          autoComplete="new-password"
          id="confirmPassword"
          label="Confirm password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          required
          type="password"
          value={confirmPassword}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button className="w-full" loading={loading} type="submit">
          Set new password
        </Button>
      </form>
    </>
  );
}
