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
import { useRef, useState } from 'react';

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

const statusColors: Record<string, string> = {
  Done: 'bg-green-500',
  'In Progress': 'bg-amber-500',
  Todo: 'bg-gray-400',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  members,
  projects = [],
  tasks: initialTasks,
  workspaceId,
}: CalendarViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<string | null>(null);
  const dragCountRef = useRef<Record<string, number>>({});

  // Sync with parent when initialTasks changes
  const [prevTasks, setPrevTasks] = useState(initialTasks);
  if (initialTasks !== prevTasks) {
    setPrevTasks(initialTasks);
    setTasks(initialTasks);
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const weeks = Math.ceil(days.length / 7);

  function tasksForDay(day: Date): TaskData[] {
    return tasks.filter((t) => {
      if (!t.endDate) {
        return false;
      }
      return isSameDay(new Date(t.endDate), day);
    });
  }

  async function moveTaskToDay(taskId: string, day: Date) {
    const newDate = day.toISOString();

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, endDate: newDate } : t)),
    );

    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endDate: newDate }),
    });
  }

  return (
    <div className="flex flex-col overflow-auto p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-1">
          <button
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setCurrentMonth(new Date())}
            type="button"
          >
            Today
          </button>
          <button
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map((day) => (
          <div
            className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            key={day}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(100px, 1fr))` }}
      >
        {days.map((day) => {
          const dayKey = day.toISOString();
          const dayTasks = tasksForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isDropTarget = dropTargetDay === dayKey;

          return (
            <div
              className={cn(
                'border-b border-r border-gray-200 p-1.5 transition-colors dark:border-gray-700',
                !inMonth && 'bg-gray-50/50 dark:bg-gray-900/30',
                today && 'bg-blue-50/50 dark:bg-blue-950/20',
                isDropTarget && 'bg-blue-100 ring-2 ring-inset ring-blue-400 dark:bg-blue-900/40',
              )}
              key={dayKey}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDropTargetDay(dayKey);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                dragCountRef.current[dayKey] = (dragCountRef.current[dayKey] || 0) + 1;
                setDropTargetDay(dayKey);
              }}
              onDragLeave={() => {
                dragCountRef.current[dayKey] = (dragCountRef.current[dayKey] || 0) - 1;
                if (dragCountRef.current[dayKey] <= 0) {
                  dragCountRef.current[dayKey] = 0;
                  if (dropTargetDay === dayKey) {
                    setDropTargetDay(null);
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                dragCountRef.current[dayKey] = 0;
                if (dragTaskId) {
                  const task = tasks.find((t) => t.id === dragTaskId);
                  const alreadyOnDay = task?.endDate && isSameDay(new Date(task.endDate), day);
                  if (!alreadyOnDay) {
                    moveTaskToDay(dragTaskId, day);
                  }
                }
                setDragTaskId(null);
                setDropTargetDay(null);
              }}
            >
              <div className="mb-1 flex justify-end">
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
              <div className="space-y-0.5 overflow-y-auto" style={{ maxHeight: '80px' }}>
                {dayTasks.map((task) => (
                  <button
                    className={cn(
                      'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing',
                      dragTaskId === task.id && 'opacity-40',
                    )}
                    draggable
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDragTaskId(task.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', task.id);
                    }}
                    onDragEnd={() => {
                      setDragTaskId(null);
                      setDropTargetDay(null);
                      dragCountRef.current = {};
                    }}
                    type="button"
                  >
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        statusColors[task.status] ?? 'bg-gray-400',
                      )}
                    />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
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
