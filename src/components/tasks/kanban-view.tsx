'use client';

import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Plus, User } from 'lucide-react';
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

interface KanbanViewProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  slug: string;
  members: TaskUser[];
  projects?: Array<{ id: string; name: string }>;
}

const STATUSES = ['Todo', 'In Progress', 'Done'];

const statusHeaderColors: Record<string, string> = {
  Done: 'border-green-500',
  'In Progress': 'border-blue-500',
  Todo: 'border-gray-400',
};

const priorityBorder: Record<string, string> = {
  HIGH: 'border-l-orange-500',
  LOW: 'border-l-green-500',
  MEDIUM: 'border-l-yellow-500',
  NONE: 'border-l-gray-300 dark:border-l-gray-600',
  URGENT: 'border-l-red-500',
};

export function KanbanView({
  members,
  projectId,
  projects = [],
  tasks: initialTasks,
  workspaceId,
}: KanbanViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const grouped = STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((t) => t.status === status),
  }));

  async function createTask(status: string) {
    if (!newTitle.trim()) {
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          status,
          projectId: projectId || undefined,
        }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks([...tasks, task]);
        setNewTitle('');
        setAddingTo(null);
        router.refresh();
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4">
      {grouped.map(({ status, tasks: columnTasks }) => (
        <div
          className="flex w-72 shrink-0 flex-col rounded-lg bg-gray-100 dark:bg-gray-900"
          key={status}
        >
          <div
            className={cn(
              'flex items-center justify-between border-t-2 px-3 py-2',
              statusHeaderColors[status] ?? 'border-gray-400',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{status}</span>
              <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {columnTasks.length}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {columnTasks.map((task) => (
              <div
                className={cn(
                  'cursor-pointer rounded-lg border border-l-4 border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800',
                  priorityBorder[task.priority] ?? priorityBorder.NONE,
                )}
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>

                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {task.taskLabels.map((tl) => (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px]"
                      key={tl.label.id}
                      style={{
                        backgroundColor: `${tl.label.color}20`,
                        color: tl.label.color,
                      }}
                    >
                      {tl.label.name}
                    </span>
                  ))}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {task.assignee ? (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {task.assignee.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                    ) : (
                      <User className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                    )}
                    {task.endDate && (
                      <span
                        className={cn(
                          'text-[10px]',
                          new Date(task.endDate) < new Date()
                            ? 'font-medium text-red-600 dark:text-red-400'
                            : 'text-gray-400 dark:text-gray-500',
                        )}
                      >
                        {formatDistanceToNow(new Date(task.endDate), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    {task._count.subTasks > 0 && (
                      <span className="text-[10px]">{task._count.subTasks} sub</span>
                    )}
                    {task._count.comments > 0 && (
                      <div className="flex items-center gap-0.5">
                        <MessageSquare className="h-3 w-3" />
                        <span className="text-[10px]">{task._count.comments}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-2 dark:border-gray-700">
            {addingTo === status ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createTask(status);
                }}
              >
                <input
                  autoFocus
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  onBlur={() => {
                    if (!newTitle.trim()) {
                      setAddingTo(null);
                    }
                  }}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Task title..."
                  value={newTitle}
                />
              </form>
            ) : (
              <button
                className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                onClick={() => {
                  setAddingTo(status);
                  setNewTitle('');
                }}
              >
                <Plus className="h-3 w-3" />
                Add task
              </button>
            )}
          </div>
        </div>
      ))}

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
