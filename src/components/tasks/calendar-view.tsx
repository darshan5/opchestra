'use client';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { TaskDetailPanel } from '@/components/tasks/task-detail-panel';
import { cn } from '@/lib/utils';

interface TaskUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: TaskUser | null;
  project: { id: string; name: string } | null;
  endDate: string | Date | null;
  isMilestone: boolean;
  taskLabels: Array<{ label: { id: string; name: string; color: string } }>;
  _count: { subTasks: number; comments: number };
}

interface CalendarViewProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  slug: string;
  members: TaskUser[];
  projects?: Array<{ id: string; name: string }>;
}

const priorityDot: Record<string, string> = {
  HIGH: 'bg-orange-500',
  LOW: 'bg-green-500',
  MEDIUM: 'bg-yellow-500',
  NONE: 'bg-gray-400',
  URGENT: 'bg-red-500',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  members,
  projects = [],
  tasks,
  workspaceId,
}: CalendarViewProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  function tasksForDay(day: Date): TaskData[] {
    return tasks.filter((t) => {
      if (!t.endDate) {
        return false;
      }
      return isSameDay(new Date(t.endDate), day);
    });
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </button>
          <button
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map((day) => (
          <div
            className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400"
            key={day}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 grid-rows-[repeat(auto-fill,minmax(0,1fr))]">
        {days.map((day) => {
          const dayTasks = tasksForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              className={cn(
                'min-h-[80px] border-b border-r border-gray-200 p-1 dark:border-gray-700',
                !inMonth && 'bg-gray-50 dark:bg-gray-900/50',
              )}
              key={day.toISOString()}
            >
              <div className="mb-0.5 flex justify-end">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    today
                      ? 'bg-blue-600 font-bold text-white'
                      : inMonth
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-600',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        priorityDot[task.priority] ?? priorityDot.NONE,
                      )}
                    />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="px-1 text-[10px] text-gray-400">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          members={members}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => router.refresh()}
          projects={projects}
          taskId={selectedTaskId}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
