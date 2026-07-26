'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface WorkspaceDistChartProps {
  data: Array<{ name: string; value: number }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function WorkspaceDistChart({ data }: WorkspaceDistChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Workspace Distribution
      </h2>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">No data yet</p>
      ) : (
        <ResponsiveContainer height={300} width="100%">
          <PieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey="value"
              innerRadius={60}
              label={({ name, value }) => `${name} (${Math.round((value / total) * 100)}%)`}
              nameKey="name"
              outerRadius={100}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell fill={COLORS[i % COLORS.length]} key={i} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {data.map((d, i) => (
          <div
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400"
            key={d.name}
          >
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}
