import { getAdminSession, requireAdmin, requireAdminRole } from './admin-session';

export { getAdminSession, requireAdmin, requireAdminRole };

export async function getAdminSessionFromRequest(): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {
  return getAdminSession();
}
