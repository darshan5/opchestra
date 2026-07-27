'use client';

import { format } from 'date-fns';
import { ChevronDown, ChevronRight, MessageSquare, Plus } from 'lucide-react';
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
  startDate?: string | Date | null;
  endDate: string | Date | null;
  isMilestone: boolean;
  taskLabels: Array<{ label: { id: string; name: string; color: string } }>;
  _count: { subTasks: number; comments: number };
}

interface TaskTableViewProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  slug: string;
  members: TaskUser[];
  projects?: Array<{ id: string; name: string }>;
}

const STATUS_ORDER = ['Todo', 'In Progress', 'Done'];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; pill: string }> = {
  Done: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-l-green-500',
    pill: 'bg-green-500 text-white',
    text: 'text-green-700 dark:text-green-400',
  },
  'In Progress': {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-l-blue-500',
    pill: 'bg-blue-500 text-white',
    text: 'text-blue-700 dark:text-blue-400',
  },
  Todo: {
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-l-gray-400',
    pill: 'bg-gray-400 text-white',
    text: 'text-gray-600 dark:text-gray-400',
  },
};

const PRIORITY_PILLS: Record<string, string> = {
  HIGH: 'bg-orange-500 text-white',
  LOW: 'bg-green-400 text-white',
  MEDIUM: 'bg-yellow-400 text-gray-900',
  NONE: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  URGENT: 'bg-red-500 text-white',
};

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTimeline(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): string | null {
  if (!startDate && !endDate) {
    return null;
  }
  const s = startDate ? format(new Date(startDate), 'MMM d') : '';
  const e = endDate ? format(new Date(endDate), 'MMM d') : '';
  if (s && e) {
    return `${s} - ${e}`;
  }
  return s || e;
}

function groupTasksByStatus(tasks: TaskData[]): Record<string, TaskData[]> {
  const groups: Record<string, TaskData[]> = {};
  for (const status of STATUS_ORDER) {
    groups[status] = [];
  }
  for (const task of tasks) {
    const key = STATUS_ORDER.includes(task.status) ? task.status : 'Todo';
    groups[key].push(task);
  }
  // Remove empty groups
  for (const key of Object.keys(groups)) {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  }
  return groups;
}

export function TaskTableView({
  members,
  projectId,
  projects = [],
  tasks: initialTasks,
  workspaceId,
}: TaskTableViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const grouped = groupTasksByStatus(tasks);

  function toggleGroup(status: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  async function createTask(status: string) {
    if (!newTaskTitle.trim()) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status,
          projectId: projectId || undefined,
        }),
      });
      if (res.ok) {
        const task = await res.json();
        setTasks([...tasks, task]);
        setNewTaskTitle('');
        setAddingInGroup(null);
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
    }
  }

  async function updateTaskAssignee(taskId: string, assigneeId: string | null) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigneeId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
    }
  }

  function handleTaskUpdated() {
    router.refresh();
  }

  function getGroupTimeline(groupTasks: TaskData[]): string | null {
    const dates = groupTasks
      .flatMap((t) => [t.startDate, t.endDate])
      .filter(Boolean)
      .map((d) => new Date(d as string).getTime());
    if (dates.length === 0) {
      return null;
    }
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return `${format(min, 'MMM d')} - ${format(max, 'MMM d')}`;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[700px]">
        {STATUS_ORDER.filter((s) => grouped[s]).map((status) => {
          const groupTasks = grouped[status] || [];
          const isCollapsed = collapsedGroups.has(status);
          const colors = STATUS_COLORS[status] || STATUS_COLORS.Todo;
          const timeline = getGroupTimeline(groupTasks);

          return (
            <div className="mb-4" key={status}>
              {/* Group Header */}
              <button
                className={cn(
                  'flex w-full items-center gap-2 border-l-4 px-4 py-2.5',
                  colors.border,
                  colors.bg,
                )}
                onClick={() => toggleGroup(status)}
                type="button"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
                <span className={cn('text-sm font-bold', colors.text)}>{status}</span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                  {groupTasks.length}
                </span>
              </button>

              {!isCollapsed && (
                <>
                  {/* Column Headers */}
                  <div className="flex items-center border-b border-gray-200 bg-gray-50/50 text-xs font-medium tracking-wider text-gray-400 uppercase dark:border-gray-800 dark:bg-gray-900/50">
                    <div className="w-8 shrink-0 px-2">
                      <input
                        className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
                        disabled
                        type="checkbox"
                      />
                    </div>
                    <div className="min-w-0 flex-1 px-3 py-2">Item</div>
                    <div className="w-24 shrink-0 px-2 py-2 text-center">People</div>
                    <div className="w-28 shrink-0 px-2 py-2 text-center">Status</div>
                    <div className="w-24 shrink-0 px-2 py-2 text-center">Priority</div>
                    <div className="w-36 shrink-0 px-2 py-2 text-center">Timeline</div>
                    <div className="w-16 shrink-0 px-2 py-2 text-center" />
                  </div>

                  {/* Task Rows */}
                  {groupTasks.map((task) => (
                    <div
                      className={cn(
                        'flex cursor-pointer items-center border-b border-gray-100 transition-colors hover:bg-blue-50/50 dark:border-gray-800/50 dark:hover:bg-blue-950/20',
                        selectedTaskId === task.id && 'bg-blue-50 dark:bg-blue-900/20',
                      )}
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      {/* Checkbox */}
                      <div className="w-8 shrink-0 px-2">
                        <input
                          className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
                          onClick={(e) => e.stopPropagation()}
                          type="checkbox"
                        />
                      </div>

                      {/* Task Name */}
                      <div className="min-w-0 flex-1 px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {task._count.subTasks > 0 && (
                            <ChevronRight className="h-3 w-3 shrink-0 text-gray-400" />
                          )}
                          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {task.title}
                          </span>
                          {task.isMilestone && (
                            <span className="shrink-0 text-xs text-purple-500">◆</span>
                          )}
                          {task.taskLabels.map((tl) => (
                            <span
                              className="shrink-0 rounded px-1 py-0.5 text-[10px]"
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
                      </div>

                      {/* Assignee Avatar */}
                      <div className="flex w-24 shrink-0 items-center justify-center px-2">
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          {task.assignee ? (
                            <div className="group relative">
                              <div
                                className={cn(
                                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white',
                                  getAvatarColor(task.assignee.name || task.assignee.email),
                                )}
                                title={task.assignee.name ?? task.assignee.email}
                              >
                                {(task.assignee.name ?? task.assignee.email).charAt(0).toUpperCase()}
                              </div>
                              <select
                                className="absolute inset-0 cursor-pointer opacity-0"
                                onChange={(e) =>
                                  updateTaskAssignee(task.id, e.target.value || null)
                                }
                                value={task.assignee.id}
                              >
                                <option value="">Unassigned</option>
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name ?? m.email}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <select
                              className="h-7 w-7 cursor-pointer rounded-full border border-dashed border-gray-300 bg-transparent text-transparent dark:border-gray-600"
                              onChange={(e) =>
                                updateTaskAssignee(task.id, e.target.value || null)
                              }
                              title="Assign"
                              value=""
                            >
                              <option value="">+</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name ?? m.email}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div
                        className="flex w-28 shrink-0 items-center justify-center px-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          className={cn(
                            'w-full cursor-pointer rounded-md border-0 py-1 text-center text-xs font-semibold',
                            colors.pill,
                          )}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                          value={task.status}
                        >
                          <option value="Todo">Todo</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>
                      </div>

                      {/* Priority Pill */}
                      <div className="flex w-24 shrink-0 items-center justify-center px-2">
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-xs font-semibold',
                            PRIORITY_PILLS[task.priority] ?? PRIORITY_PILLS.NONE,
                          )}
                        >
                          {task.priority === 'NONE' ? '-' : task.priority.toLowerCase()}
                        </span>
                      </div>

                      {/* Timeline */}
                      <div className="flex w-36 shrink-0 items-center justify-center px-2">
                        {(task.startDate || task.endDate) && (
                          <span className="rounded-full bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-white dark:bg-gray-600">
                            {formatTimeline(task.startDate, task.endDate)}
                          </span>
                        )}
                      </div>

                      {/* Comments */}
                      <div className="flex w-16 shrink-0 items-center justify-center px-2">
                        {task._count.comments > 0 && (
                          <div className="flex items-center gap-1 text-gray-400">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span className="text-xs">{task._count.comments}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Item Row */}
                  <div className="border-b border-gray-100 dark:border-gray-800/50">
                    {addingInGroup === status ? (
                      <form
                        className="flex items-center px-4 py-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          createTask(status);
                        }}
                      >
                        <div className="w-8 shrink-0" />
                        <input
                          autoFocus
                          className="min-w-0 flex-1 bg-transparent py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white dark:placeholder-gray-500"
                          disabled={saving}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              setAddingInGroup(null);
                              setNewTaskTitle('');
                            }
                          }}
                          placeholder="Task name..."
                          value={newTaskTitle}
                        />
                        {newTaskTitle.trim() && (
                          <button
                            className="ml-2 rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
                            disabled={saving}
                            type="submit"
                          >
                            Add
                          </button>
                        )}
                        <button
                          className="ml-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          onClick={() => {
                            setAddingInGroup(null);
                            setNewTaskTitle('');
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <button
                        className="flex w-full items-center gap-1.5 px-4 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => {
                          setAddingInGroup(status);
                          setNewTaskTitle('');
                        }}
                        type="button"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add item
                      </button>
                    )}
                  </div>

                  {/* Group Summary Row */}
                  {groupTasks.length > 0 && (
                    <div className="flex items-center bg-gray-50/80 text-xs text-gray-400 dark:bg-gray-900/30">
                      <div className="w-8 shrink-0" />
                      <div className="min-w-0 flex-1 px-3 py-1.5" />
                      <div className="w-24 shrink-0" />
                      <div className="flex w-28 shrink-0 items-center justify-center px-2">
                        {/* Stacked status bar */}
                        <div className="flex h-1.5 w-full overflow-hidden rounded-full">
                          {(() => {
                            const done = groupTasks.filter((t) => t.status === 'Done').length;
                            const inProg = groupTasks.filter(
                              (t) => t.status === 'In Progress',
                            ).length;
                            const todo = groupTasks.length - done - inProg;
                            const total = groupTasks.length;
                            return (
                              <>
                                {done > 0 && (
                                  <div
                                    className="bg-green-500"
                                    style={{ width: `${(done / total) * 100}%` }}
                                  />
                                )}
                                {inProg > 0 && (
                                  <div
                                    className="bg-blue-500"
                                    style={{ width: `${(inProg / total) * 100}%` }}
                                  />
                                )}
                                {todo > 0 && (
                                  <div
                                    className="bg-gray-300 dark:bg-gray-600"
                                    style={{ width: `${(todo / total) * 100}%` }}
                                  />
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="w-24 shrink-0" />
                      <div className="flex w-36 shrink-0 items-center justify-center px-2">
                        {timeline && (
                          <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] text-gray-300">
                            {timeline}
                          </span>
                        )}
                      </div>
                      <div className="w-16 shrink-0 px-2 py-1.5 text-center">
                        <span className="text-[10px]">
                          {groupTasks.length} {groupTasks.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {Object.keys(grouped).length === 0 && (
          <div className="px-8 py-16 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks yet</p>
            <button
              className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              onClick={() => setAddingInGroup('Todo')}
              type="button"
            >
              Create your first task
            </button>
          </div>
        )}
      </div>

      {selectedTaskId && (
        <TaskDetailPanel
          members={members}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={handleTaskUpdated}
          projects={projects}
          taskId={selectedTaskId}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
