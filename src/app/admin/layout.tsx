import { Building2, LogOut, Settings, Shield } from 'lucide-react';
import Link from 'next/link';

import { requireSaasAdmin } from '@/lib/auth/admin';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSaasAdmin();

  return (
    <div className="flex h-full">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-800">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-gray-900 dark:text-white">SaaS Admin</span>
        </div>

        <nav className="flex-1 space-y-0.5 p-2">
          <Link
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
            href="/admin"
          >
            <Building2 className="h-4 w-4" />
            Workspaces
          </Link>
          <Link
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
            href="/admin/settings"
          >
            <Settings className="h-4 w-4" />
            Platform Settings
          </Link>
        </nav>

        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{admin.email}</p>
          <div className="mt-2 flex gap-2">
            <Link
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              href="/app"
            >
              App
            </Link>
            <Link
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              href="/api/auth/signout"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </Link>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
