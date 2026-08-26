'use client';

import {
  FileText,
  Home,
  LogOut,
  Menu,
  Moon,
  Repeat,
  ShoppingBag,
  Store,
  Sun,
  Ticket,
  User,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface PortalSidebarProps {
  slug: string;
  workspaceName: string;
  userName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
}

export function PortalSidebar({
  logoUrl,
  primaryColor = '#6366f1',
  slug,
  userName,
  workspaceName,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    setTheme(stored === 'dark' ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  const base = `/portal/${slug}`;

  const navItems = [
    { href: base, icon: Home, label: 'Dashboard' },
    { href: `${base}/services`, icon: Store, label: 'Services' },
    { href: `${base}/orders`, icon: ShoppingBag, label: 'Orders' },
    { href: `${base}/subscriptions`, icon: Repeat, label: 'Subscriptions' },
    { href: `${base}/tickets`, icon: Ticket, label: 'Tickets' },
    { href: `${base}/invoices`, icon: FileText, label: 'Invoices' },
    { href: `${base}/profile`, icon: User, label: 'Profile' },
  ];

  function isActive(href: string) {
    if (href === base) return pathname === base;
    return pathname.startsWith(href);
  }

  return (
    <>
      <button
        className="fixed top-3 left-3 z-50 rounded-lg border border-gray-200 bg-white p-2 shadow-sm lg:hidden dark:border-gray-700 dark:bg-gray-900"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-950',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-14 items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800">
          {logoUrl ? (
            <img alt={workspaceName} className="h-8 w-8 rounded object-contain" src={logoUrl} />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded text-sm font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {workspaceName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {workspaceName}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive(item.href)
                    ? 'font-medium text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                )}
                href={item.href}
                key={item.href}
                style={isActive(item.href) ? { backgroundColor: primaryColor } : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-200 px-3 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {userName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
              {userName}
            </span>
            {mounted && (
              <button
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                onClick={toggleTheme}
                title={`Theme: ${theme}`}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <button
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
