import { BarChart3, CheckCircle, Clock, FileText, Ticket } from 'lucide-react';

export default function ReportsPage() {
  const reports = [
    {
      icon: Clock,
      title: 'Time Report',
      description:
        'Billable hours, adjustments, and deleted entries by employee, project, and date range.',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
    },
    {
      icon: CheckCircle,
      title: 'Task Report',
      description:
        'Completion rates, overdue tasks, average time to close, grouped by project or person.',
      color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
    },
    {
      icon: Ticket,
      title: 'Ticket Report',
      description:
        'Ticket volume, average resolution time, SLA compliance rates, by source and priority.',
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
    },
    {
      icon: BarChart3,
      title: 'Project Report',
      description:
        'Project progress overview, phase completion, budget vs actual, timeline adherence.',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
    },
    {
      icon: FileText,
      title: 'Invoice Report',
      description:
        'Revenue summary, outstanding invoices, payment history, aging report by client.',
      color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Workspace analytics and insights
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <div
            className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            key={report.title}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-lg p-2 ${report.color}`}>
                <report.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {report.title}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {report.description}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Coming Soon
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
