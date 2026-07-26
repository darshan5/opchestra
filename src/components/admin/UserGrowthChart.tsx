'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface UserGrowthChartProps {
  data: Array<{ month: string; count: number }>;
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">User Growth</h2>
      <ResponsiveContainer height={300} width="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis
            dataKey="month"
            fontSize={12}
            tickFormatter={(v) => {
              const [y, m] = v.split('-');
              const months = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
              ];
              return `${months[parseInt(m, 10) - 1]} ${y.slice(2)}`;
            }}
          />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg, #fff)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Line
            dataKey="count"
            dot={{ fill: '#3b82f6', r: 4 }}
            name="Signups"
            stroke="#3b82f6"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
