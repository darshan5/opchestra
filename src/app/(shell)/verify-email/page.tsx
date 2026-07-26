'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, use, useState } from 'react';

async function verifyEmail(token: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`/api/auth/verify-email?token=${token}`);
    const data = await res.json();
    return { message: data.message || data.error, ok: res.ok };
  } catch {
    return { message: 'Something went wrong.', ok: false };
  }
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Verification Failed</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          No verification token provided.
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

  return <VerifyWithToken token={token} />;
}

function VerifyWithToken({ token }: { token: string }) {
  const [promise] = useState(() => verifyEmail(token));
  const result = use(promise);

  return (
    <div className="text-center">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        {result.ok ? 'Email Verified' : 'Verification Failed'}
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{result.message}</p>
      <Link
        className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
        href="/login"
      >
        {result.ok ? 'Sign in to your account' : 'Back to login'}
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
