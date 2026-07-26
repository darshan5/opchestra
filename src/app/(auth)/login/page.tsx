'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error.includes('EMAIL_NOT_VERIFIED')) {
          setError('Please verify your email before signing in.');
        } else {
          setError('Invalid email or password.');
        }
        return;
      }

      router.push('/app');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">Sign in</h2>
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
        <Input
          autoComplete="current-password"
          id="password"
          label="Password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          type="password"
          value={password}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button className="w-full" loading={loading} type="submit">
          Sign in
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link className="text-blue-600 hover:underline dark:text-blue-400" href="/reset-password">
          Forgot password?
        </Link>
        <Link className="text-blue-600 hover:underline dark:text-blue-400" href="/signup">
          Create account
        </Link>
      </div>
    </>
  );
}
