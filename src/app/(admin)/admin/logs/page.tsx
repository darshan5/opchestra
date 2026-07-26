'use client';

import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

interface AuditLogEntry {
  id: string;
  action: string;
  adminUser: { email: string; name: string | null } | null;
  targetUser: { email: string; name: string | null } | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/logs')
      .then((r) => r.json())
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        All admin actions are logged here for security and compliance.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Action
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Admin
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Target
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Details
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2.5">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {log.adminUser?.email || '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {log.targetUser?.email || '—'}
                </td>
                <td className="max-w-xs px-4 py-2.5 text-xs text-gray-400 dark:text-gray-500">
                  {log.details ? (
                    <span className="truncate" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details).substring(0, 60)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={5}>
                  No audit logs yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
