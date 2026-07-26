'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Check your email</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your
          account.
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
      <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
        Create your account
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          autoComplete="name"
          id="name"
          label="Full name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          required
          type="text"
          value={name}
        />
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
        <Input
          autoComplete="new-password"
          id="password"
          label="Password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          required
          type="password"
          value={password}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button className="w-full" loading={loading} type="submit">
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
        Already have an account?{' '}
        <Link className="text-blue-600 hover:underline dark:text-blue-400" href="/login">
          Sign in
        </Link>
      </p>
    </>
  );
}
