import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE_NAME = 'admin-session';
const JWT_SECRET = process.env.AUTH_SECRET || 'dev-secret';

interface AdminSessionPayload {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminSessionPayload;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin-login');
  }
  return session;
}

export async function requireAdminRole(
  minimumRole: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'VIEWER',
): Promise<AdminSessionPayload> {
  const session = await requireAdmin();
  const hierarchy = ['VIEWER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'];
  const userLevel = hierarchy.indexOf(session.role);
  const requiredLevel = hierarchy.indexOf(minimumRole);

  if (userLevel < requiredLevel) {
    redirect('/admin');
  }

  return session;
}

export function createAdminToken(payload: AdminSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function getAdminCookieConfig() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24,
    name: COOKIE_NAME,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}
