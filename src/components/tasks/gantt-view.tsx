'use client';

import {
  addDays,
  addMonths,
  addWeeks,
  max as dateMax,
  min as dateMin,
  differenceInDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  format,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Diamond } from 'lucide-react';
import { useMemo, useState } from 'react';

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
  startDate?: string | Date | null;
  endDate: string | Date | null;
  isMilestone: boolean;
  taskLabels: Array<{ label: { id: string; name: string; color: string } }>;
  _count: { subTasks: number; comments: number };
  dependsOn?: Array<{ dependsOnId: string }>;
}

interface GanttViewProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  slug: string;
  members: TaskUser[];
  projects?: Array<{ id: string; name: string }>;
}

type Zoom = 'day' | 'week' | 'month';

const BAR_HEIGHT = 28;
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 220;

const statusColors: Record<string, string> = {
  Done: '#10B981',
  'In Progress': '#3B82F6',
  Todo: '#9CA3AF',
};

const priorityBorderColors: Record<string, string> = {
  HIGH: '#F97316',
  LOW: '#22C55E',
  MEDIUM: '#EAB308',
  NONE: '#D1D5DB',
  URGENT: '#EF4444',
};

export function GanttView({ members, projectId, projects = [], slug, tasks, workspaceId }: GanttViewProps) {
  const [zoom, setZoom] = useState<Zoom>('week');
  const [offset, setOffset] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const scheduledTasks = useMemo(
    () => tasks.filter((t) => t.startDate || t.endDate),
    [tasks],
  );
  const unscheduledTasks = useMemo(
    () => tasks.filter((t) => !t.startDate && !t.endDate),
    [tasks],
  );

  const { colWidth, columns, rangeEnd, rangeStart } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (scheduledTasks.length > 0) {
      const dates = scheduledTasks.flatMap((t) => {
        const d: Date[] = [];
        if (t.startDate) { d.push(new Date(t.startDate)); }
        if (t.endDate) { d.push(new Date(t.endDate)); }
        return d;
      });
      start = addDays(dateMin(dates), -7);
      end = addDays(dateMax(dates), 14);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(addMonths(now, 2));
    }

    if (zoom === 'day') {
      start = addDays(start, offset * 14);
      end = addDays(start, 28);
      const cols = eachDayOfInterval({ end, start }).map((d) => ({
        date: d,
        label: format(d, 'd'),
        sublabel: format(d, 'EEE'),
      }));
      return { colWidth: 40, columns: cols, rangeEnd: end, rangeStart: start };
    }
    if (zoom === 'week') {
      start = addWeeks(startOfWeek(start), offset * 4);
      end = addWeeks(start, 12);
      const cols = eachWeekOfInterval({ end, start }).map((d) => ({
        date: d,
        label: format(d, 'MMM d'),
        sublabel: '',
      }));
      return { colWidth: 80, columns: cols, rangeEnd: end, rangeStart: start };
    }
    // month
    start = addMonths(startOfMonth(start), offset * 3);
    end = addMonths(start, 12);
    const cols = eachMonthOfInterval({ end, start }).map((d) => ({
      date: d,
      label: format(d, 'MMM'),
      sublabel: format(d, 'yyyy'),
    }));
    return { colWidth: 100, columns: cols, rangeEnd: end, rangeStart: start };
  }, [scheduledTasks, zoom, offset]);

  const totalDays = differenceInDays(rangeEnd, rangeStart) || 1;
  const timelineWidth = columns.length * colWidth;

  function getBarPosition(task: TaskData) {
    const s = task.startDate ? new Date(task.startDate) : task.endDate ? new Date(task.endDate) : null;
    const e = task.endDate ? new Date(task.endDate) : s;
    if (!s || !e) { return null; }

    const startOffset = differenceInDays(s, rangeStart);
    const duration = Math.max(differenceInDays(e, s), 1);
    const left = (startOffset / totalDays) * timelineWidth;
    const width = (duration / totalDays) * timelineWidth;

    return { left: Math.max(left, 0), width: Math.max(width, 8) };
  }

  function getTodayPosition() {
    const daysSinceStart = differenceInDays(new Date(), rangeStart);
    return (daysSinceStart / totalDays) * timelineWidth;
  }

  const todayPos = getTodayPosition();

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
            onClick={() => setOffset(0)}
          >
            Today
          </button>
          <button
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
          {(['day', 'week', 'month'] as Zoom[]).map((z) => (
            <button
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                zoom === z
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400',
              )}
              key={z}
              onClick={() => { setZoom(z); setOffset(0); }}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex flex-1 overflow-hidden">
        {/* Labels */}
        <div className="flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-800" style={{ width: LABEL_WIDTH }}>
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400" style={{ height: 40 }}>
            Task
          </div>
          {scheduledTasks.map((task) => (
            <div
              className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              key={task.id}
              onClick={() => setSelectedTaskId(task.id)}
              style={{ height: ROW_HEIGHT }}
            >
              {task.isMilestone && <Diamond className="h-3 w-3 text-purple-500" />}
              <span className="truncate text-gray-900 dark:text-white">{task.title}</span>
            </div>
          ))}
          {unscheduledTasks.length > 0 && (
            <>
              <div className="border-b border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                Unscheduled ({unscheduledTasks.length})
              </div>
              {unscheduledTasks.map((task) => (
                <div
                  className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 text-sm text-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="truncate">{task.title}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-auto">
          <div className="relative" style={{ minWidth: timelineWidth }}>
            {/* Header */}
            <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900" style={{ height: 40 }}>
              {columns.map((col, i) => (
                <div
                  className={cn(
                    'flex flex-col items-center justify-center border-r border-gray-100 text-xs dark:border-gray-800',
                    isToday(col.date) && 'bg-blue-50 dark:bg-blue-900/20',
                  )}
                  key={i}
                  style={{ width: colWidth }}
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300">{col.label}</span>
                  {col.sublabel && <span className="text-gray-400 dark:text-gray-500">{col.sublabel}</span>}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="relative">
              {/* Grid lines */}
              <div className="absolute inset-0">
                {columns.map((_, i) => (
                  <div
                    className="absolute top-0 bottom-0 border-r border-gray-50 dark:border-gray-900"
                    key={i}
                    style={{ left: i * colWidth }}
                  />
                ))}
              </div>

              {/* Today marker */}
              {todayPos >= 0 && todayPos <= timelineWidth && (
                <div
                  className="absolute top-0 bottom-0 z-10 w-0.5 bg-red-500"
                  style={{ left: todayPos }}
                />
              )}

              {/* Task bars */}
              {scheduledTasks.map((task, rowIdx) => {
                const pos = getBarPosition(task);
                if (!pos) { return null; }

                return (
                  <div
                    className="relative border-b border-gray-100 dark:border-gray-800"
                    key={task.id}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {task.isMilestone ? (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => setSelectedTaskId(task.id)}
                        style={{ left: pos.left }}
                      >
                        <Diamond className="h-5 w-5 fill-purple-500 text-purple-600" />
                      </div>
                    ) : (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 cursor-pointer rounded"
                        onClick={() => setSelectedTaskId(task.id)}
                        style={{
                          backgroundColor: statusColors[task.status] ?? '#9CA3AF',
                          borderLeft: `3px solid ${priorityBorderColors[task.priority] ?? '#D1D5DB'}`,
                          height: BAR_HEIGHT,
                          left: pos.left,
                          opacity: 0.85,
                          width: pos.width,
                        }}
                        title={`${task.title} (${task.status})`}
                      >
                        <span className="truncate px-1.5 text-xs leading-7 text-white">
                          {pos.width > 60 ? task.title : ''}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unscheduled placeholder rows */}
              {unscheduledTasks.length > 0 && (
                <>
                  <div style={{ height: 28 }} />
                  {unscheduledTasks.map((task) => (
                    <div
                      className="border-b border-gray-100 dark:border-gray-800"
                      key={task.id}
                      style={{ height: ROW_HEIGHT }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedTaskId && (
        <TaskDetailPanel
          members={members}
          onClose={() => setSelectedTaskId(null)}
          projects={projects}
          taskId={selectedTaskId}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
