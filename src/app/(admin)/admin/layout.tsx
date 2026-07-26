import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { requireAdmin } from '@/lib/auth/admin-session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex h-full">
      <AdminSidebar adminEmail={admin.email} adminRole={admin.role} />
      <main className="flex-1 overflow-auto bg-white dark:bg-gray-950">{children}</main>
    </div>
  );
}
