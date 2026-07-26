import { NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { isSaasAdmin } from '@/lib/auth/admin';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ isAdmin: false });
  }

  const isAdmin = await isSaasAdmin(session.user.id);
  return NextResponse.json({ isAdmin });
}
