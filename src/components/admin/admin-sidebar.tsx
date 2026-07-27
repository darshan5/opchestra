'use client';

import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Moon,
  Settings,
  Sun,
  Tag,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface AdminSidebarProps {
  adminEmail: string;
  adminRole: string;
}

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Subscribers' },
  { href: '/admin/admin-users', icon: UserCog, label: 'Admin Users' },
  { href: '/admin/plans', icon: CreditCard, label: 'Plans' },
  { href: '/admin/discounts', icon: Tag, label: 'Discounts' },
  { href: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { href: '/admin/logs', icon: FileText, label: 'Audit Logs' },
  { badge: true, href: '/admin/support', icon: MessageCircle, label: 'Support' },
  { href: '/admin/provisioning', icon: UserPlus, label: 'Provisioning' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AdminSidebar({ adminEmail, adminRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [ticketCount, setTicketCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('admin-theme');
    setTheme(stored === 'dark' ? 'dark' : 'light');
    setMounted(true);
  }, []);

  const fetchTicketCount = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/support/unread');
      if (res.ok) {
        const data = await res.json();
        setTicketCount(data.count ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTicketCount();
    const interval = setInterval(fetchTicketCount, 60000);
    return () => clearInterval(interval);
  }, [fetchTicketCount]);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('admin-theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 dark:border-gray-800">
        <span className="text-sm font-bold text-gray-900 dark:text-white">Admin</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800',
              )}
              href={item.href}
              key={item.href}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {'badge' in item && item.badge && ticketCount > 0 && (
                <span className="ml-auto inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {ticketCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{adminEmail}</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">{adminRole}</p>
        <div className="mt-2 flex items-center justify-between">
          <form action="/api/admin/auth/logout" method="POST">
            <button
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              type="submit"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </form>
          {mounted && (
            <button
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              onClick={toggleTheme}
              title={`Theme: ${theme}`}
              type="button"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
