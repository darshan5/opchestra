'use client';

import { format } from 'date-fns';
import { Info, ListChecks, MessageSquare, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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

interface StatusDef {
  name: string;
  color: string;
  category: string;
}

interface KanbanViewProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  slug: string;
  members: TaskUser[];
  projects?: Array<{ id: string; name: string }>;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(' ');
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }
  return email.charAt(0).toUpperCase();
}

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#F97316',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function KanbanView({
  members,
  projectId,
  projects = [],
  tasks: initialTasks,
  workspaceId,
}: KanbanViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks);
  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [statusDefs, setStatusDefs] = useState<StatusDef[]>([
    { name: 'Todo', color: '#6B7280', category: 'todo' },
    { name: 'In Progress', color: '#F59E0B', category: 'in_progress' },
    { name: 'Done', color: '#10B981', category: 'done' },
  ]);

  const fetchStatuses = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { id: string }) => w.id === workspaceId);
      if (!ws) {
        return;
      }
      const res = await fetch(`/api/workspaces/${workspaceId}/workflows/default`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.statuses) && data.statuses.length > 0) {
          setStatusDefs(data.statuses);
        }
      }
    } catch {
      // use defaults
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const columns = statusDefs.map((sd) => ({
    ...sd,
    tasks: tasks.filter((t) => t.status === sd.name),
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
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {columns.map((col) => (
        <div className="flex w-80 shrink-0 flex-col rounded-lg" key={col.name}>
          {/* Column header */}
          <div
            className="flex items-center gap-2 rounded-t-lg px-4 py-2.5"
            style={{ backgroundColor: col.color }}
          >
            <span className="text-sm font-bold text-white">{col.name}</span>
            <span className="text-sm font-medium text-white/80">{col.tasks.length}</span>
          </div>

          {/* Cards */}
          <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-2 dark:bg-gray-900/50">
            {col.tasks.map((task) => (
              <div
                className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
              >
                {/* Title */}
                <p className="text-sm font-semibold text-gray-900 leading-snug dark:text-white">
                  {task.title}
                </p>

                {/* Tags: status + project */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className="inline-flex items-center rounded text-[11px] font-medium text-gray-700 dark:text-gray-300"
                  >
                    <span
                      className="mr-1.5 inline-block h-3 w-0.5 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    {task.status}
                  </span>
                  {task.project && (
                    <span className="inline-flex items-center rounded text-[11px] font-medium text-gray-700 dark:text-gray-300">
                      <span
                        className="mr-1.5 inline-block h-3 w-0.5 rounded-full"
                        style={{ backgroundColor: hashColor(task.project.name) }}
                      />
                      {task.project.name}
                    </span>
                  )}
                </div>

                {/* Assignee */}
                {task.assignee && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                    {task.assignee.name ?? task.assignee.email}
                  </div>
                )}

                {/* Bottom: avatar + icons */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex -space-x-1">
                    {task.assignee && (
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white dark:border-gray-800"
                        style={{ backgroundColor: hashColor(task.assignee.name ?? task.assignee.email) }}
                      >
                        {getInitials(task.assignee.name, task.assignee.email)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    {task._count.comments > 0 && (
                      <div className="flex items-center gap-0.5">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="text-[10px]">{task._count.comments}</span>
                      </div>
                    )}
                    {task._count.subTasks > 0 && (
                      <div className="flex items-center gap-0.5">
                        <ListChecks className="h-3.5 w-3.5" />
                        <span className="text-[10px]">{task._count.subTasks}</span>
                      </div>
                    )}
                    <button
                      className="invisible rounded p-0.5 hover:bg-gray-100 group-hover:visible dark:hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTaskId(task.id);
                      }}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add task */}
          <div className="rounded-b-lg border-t border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/50">
            {addingTo === col.name ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createTask(col.name);
                }}
              >
                <input
                  autoFocus
                  className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
                className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                onClick={() => {
                  setAddingTo(col.name);
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
