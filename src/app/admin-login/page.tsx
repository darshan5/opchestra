'use client';

import { Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLoginPage() {
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
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        return;
      }

      router.push(data.redirect || '/admin');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SaaS Admin Portal</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Platform administration access
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-6 text-xl font-semibold text-gray-900 dark:text-white">
            Admin Sign In
          </h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              autoComplete="email"
              id="email"
              label="Email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
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
              Sign in to Admin
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
