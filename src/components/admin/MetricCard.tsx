'use client';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
}

export function MetricCard({ change, subtitle, title, value }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {change !== undefined && (
        <p className={`mt-1 text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? '+' : ''}
          {change}% from last month
        </p>
      )}
      {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
    </div>
  );
}
