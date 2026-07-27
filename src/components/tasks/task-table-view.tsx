'use client';

import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  MessageSquare,
  MoreHorizontal,
  Plus,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

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

interface SubTaskData {
  id: string;
  title: string;
  status: string;
  assignee: TaskUser | null;
  endDate: string | Date | null;
  _count: { subTasks: number };
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

const STATUS_CELL: Record<string, string> = {
  Done: 'bg-green-500 text-white',
  'In Progress': 'bg-amber-400 text-white',
  Todo: 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
};

const GROUP_COLORS: Record<string, { border: string; header: string; text: string }> = {
  Done: {
    border: 'border-l-green-500',
    header: 'text-green-600 dark:text-green-400',
    text: 'text-green-600',
  },
  'In Progress': {
    border: 'border-l-amber-400',
    header: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-600',
  },
  Todo: {
    border: 'border-l-gray-400',
    header: 'text-gray-500 dark:text-gray-400',
    text: 'text-gray-500',
  },
};

const PRIORITY_CELL: Record<string, string> = {
  HIGH: 'bg-orange-400 text-white',
  LOW: 'bg-blue-300 text-white',
  MEDIUM: 'bg-yellow-300 text-gray-800',
  NONE: '',
  URGENT: 'bg-red-500 text-white',
};

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-600',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-emerald-600',
];

const PROJECT_COLORS = [
  'bg-blue-500 text-white',
  'bg-orange-400 text-white',
  'bg-green-500 text-white',
  'bg-purple-500 text-white',
  'bg-red-400 text-white',
  'bg-teal-500 text-white',
  'bg-pink-500 text-white',
  'bg-indigo-500 text-white',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = s.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

function getAvatarColor(name: string) {
  return AVATAR_COLORS[hashStr(name) % AVATAR_COLORS.length];
}

function getProjectColor(name: string) {
  return PROJECT_COLORS[hashStr(name) % PROJECT_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
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
  return groups;
}

// ── Context Menu ─────────────────────────────────────────────

function ContextMenu({
  onAddSubitem,
  onClose,
  onCreateBelow,
  onDelete,
  onOpen,
  position,
}: {
  onClose: () => void;
  onOpen: () => void;
  onCreateBelow: () => void;
  onAddSubitem: () => void;
  onDelete: () => void;
  position: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const items = [
    { action: onOpen, icon: ExternalLink, label: 'Open task' },
    { action: () => {}, disabled: true, icon: Copy, label: 'Copy task link' },
    { action: onCreateBelow, icon: Plus, label: 'Create new task below' },
    { divider: true },
    { action: onAddSubitem, icon: PlusCircle, label: 'Add subitem' },
    { divider: true },
    { action: onDelete, danger: true, icon: Trash2, label: 'Delete' },
  ];

  return (
    <div
      className="fixed z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      ref={ref}
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, i) =>
        'divider' in item ? (
          <div
            className="my-1 border-t border-gray-100 dark:border-gray-800"
            key={`d-${String(i)}`}
          />
        ) : (
          <button
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-1.5 text-sm transition-colors',
              item.disabled
                ? 'cursor-default text-gray-300 dark:text-gray-600'
                : item.danger
                  ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
            )}
            disabled={item.disabled}
            key={item.label}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            type="button"
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}

// ── Sub-items Section ────────────────────────────────────────

function SubItemsSection({
  members,
  parentTaskId,
  workspaceId,
}: {
  parentTaskId: string;
  workspaceId: string;
  members: TaskUser[];
}) {
  const [subTasks, setSubTasks] = useState<SubTaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/tasks?parentTaskId=${parentTaskId}`,
      );
      if (res.ok) {
        setSubTasks(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, parentTaskId]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  async function addSubItem() {
    if (!newTitle.trim()) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
      body: JSON.stringify({ parentTaskId, title: newTitle.trim() }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    if (res.ok) {
      const task = await res.json();
      setSubTasks([...subTasks, task]);
      setNewTitle('');
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <div className="ml-10 border-l-2 border-green-400 bg-blue-50/60 py-2 pl-4 text-xs text-gray-400 dark:bg-blue-950/20">
        Loading...
      </div>
    );
  }

  return (
    <div className="ml-10 border-l-2 border-green-400 bg-blue-50/60 dark:bg-blue-950/20">
      {/* Sub-item header */}
      <div className="flex items-center border-b border-blue-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:border-blue-900/40">
        <div className="w-7 shrink-0 px-1">
          <input className="h-3 w-3 rounded border-gray-300" disabled type="checkbox" />
        </div>
        <div className="min-w-0 flex-1 px-2 py-1.5">Subitem</div>
        <div className="w-20 shrink-0 px-1 text-center">Owner</div>
        <div className="w-24 shrink-0 px-1 text-center">Status</div>
        <div className="w-24 shrink-0 px-1 text-center">Date</div>
        <div className="w-8 shrink-0" />
      </div>

      {subTasks.map((sub) => (
        <div
          className="flex items-center border-b border-blue-100/60 hover:bg-blue-100/40 dark:border-blue-900/30 dark:hover:bg-blue-900/20"
          key={sub.id}
        >
          <div className="w-7 shrink-0 px-1">
            <input className="h-3 w-3 rounded border-gray-300" type="checkbox" />
          </div>
          <div className="min-w-0 flex-1 px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200">
            {sub.title}
          </div>
          <div className="flex w-20 shrink-0 items-center justify-center px-1">
            {sub.assignee && (
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white',
                  getAvatarColor(sub.assignee.name || sub.assignee.email),
                )}
                title={sub.assignee.name ?? sub.assignee.email}
              >
                {initials(sub.assignee.name || sub.assignee.email)}
              </div>
            )}
          </div>
          <div className="flex w-24 shrink-0 items-center justify-center px-1">
            <span
              className={cn(
                'w-full rounded py-0.5 text-center text-[11px] font-semibold',
                STATUS_CELL[sub.status] ?? STATUS_CELL.Todo,
              )}
            >
              {sub.status}
            </span>
          </div>
          <div className="w-24 shrink-0 px-1 text-center text-xs text-gray-500">
            {sub.endDate ? format(new Date(sub.endDate), 'MMM d') : ''}
          </div>
          <div className="w-8 shrink-0" />
        </div>
      ))}

      {/* Add subitem */}
      {adding ? (
        <form
          className="flex items-center px-2 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            addSubItem();
          }}
        >
          <div className="w-7 shrink-0" />
          <input
            autoFocus
            className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800"
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAdding(false);
                setNewTitle('');
              }
            }}
            placeholder="Subitem name..."
            value={newTitle}
          />
          <button
            className="ml-1 rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
            type="submit"
          >
            Add
          </button>
          <button
            className="ml-1 text-xs text-gray-400 hover:text-gray-600"
            onClick={() => {
              setAdding(false);
              setNewTitle('');
            }}
            type="button"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          className="flex w-full items-center gap-1 px-4 py-1.5 text-xs text-gray-400 hover:text-blue-500"
          onClick={() => setAdding(true)}
          type="button"
        >
          <Plus className="h-3 w-3" />
          Add subitem
        </button>
      )}
    </div>
  );
}

// ── Main Table ───────────────────────────────────────────────

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
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    taskId: string;
    status: string;
    x: number;
    y: number;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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

  function toggleExpand(taskId: string) {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
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
        body: JSON.stringify({ projectId: projectId || undefined, status, title: newTaskTitle.trim() }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      if (res.ok) {
        const task = await res.json();
        setTasks([...tasks, task]);
        setNewTaskTitle('');
        setAddingInGroup(null);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      body: JSON.stringify({ status }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
    }
  }

  async function updateTaskAssignee(taskId: string, assigneeId: string | null) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      body: JSON.stringify({ assigneeId }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
    }
  }

  async function deleteTask(taskId: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) {
      setTasks(tasks.filter((t) => t.id !== taskId));
      setConfirmDelete(null);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[800px]">
        {STATUS_ORDER.map((status) => {
          const groupTasks = grouped[status] || [];
          const isCollapsed = collapsedGroups.has(status);
          const gc = GROUP_COLORS[status] || GROUP_COLORS.Todo;

          return (
            <div className="mb-2" key={status}>
              {/* ── Group Header ─────────────── */}
              <button
                className={cn('flex w-full items-center gap-2 border-l-4 px-3 py-2', gc.border)}
                onClick={() => toggleGroup(status)}
                type="button"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
                <span className={cn('text-sm font-bold', gc.header)}>{status}</span>
                <span className="text-xs text-gray-400">({groupTasks.length})</span>
              </button>

              {!isCollapsed && (
                <>
                  {/* ── Column Headers ─────────── */}
                  <div className="flex items-center border-b border-gray-200 bg-white text-[11px] font-medium tracking-wider text-gray-400 uppercase dark:border-gray-800 dark:bg-gray-950">
                    <div className="w-9 shrink-0" />
                    <div className="w-7 shrink-0 px-1">
                      <input className="h-3 w-3 rounded border-gray-300" disabled type="checkbox" />
                    </div>
                    <div className="min-w-0 flex-1 px-2 py-2">Task</div>
                    <div className="w-24 shrink-0 px-1 text-center">Person</div>
                    <div className="w-28 shrink-0 px-1 text-center">Status</div>
                    <div className="w-24 shrink-0 px-1 text-center">Priority</div>
                    <div className="w-24 shrink-0 px-1 text-center">Date</div>
                    <div className="w-32 shrink-0 px-1 text-center">Project</div>
                    <div className="w-10 shrink-0" />
                  </div>

                  {/* ── Task Rows ─────────────── */}
                  {groupTasks.map((task) => {
                    const isExpanded = expandedTasks.has(task.id);
                    const hasSubs = task._count.subTasks > 0;

                    return (
                      <div key={task.id}>
                        <div
                          className={cn(
                            'group flex items-center border-b border-gray-100 transition-colors hover:bg-blue-50/50 dark:border-gray-800/50 dark:hover:bg-blue-950/20',
                            selectedTaskId === task.id && 'bg-blue-50 dark:bg-blue-900/20',
                          )}
                        >
                          {/* Three-dot menu */}
                          <div className="flex w-9 shrink-0 items-center justify-center">
                            <button
                              className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-gray-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-gray-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setContextMenu({
                                  status,
                                  taskId: task.id,
                                  x: rect.left,
                                  y: rect.bottom + 4,
                                });
                              }}
                              type="button"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Checkbox */}
                          <div className="w-7 shrink-0 px-1">
                            <input
                              className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
                              onClick={(e) => e.stopPropagation()}
                              type="checkbox"
                            />
                          </div>

                          {/* Task Name */}
                          <div
                            className="min-w-0 flex-1 cursor-pointer px-2 py-2"
                            onClick={() => setSelectedTaskId(task.id)}
                          >
                            <div className="flex items-center gap-1.5">
                              {hasSubs && (
                                <button
                                  className="shrink-0 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(task.id);
                                  }}
                                  type="button"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                {task.title}
                              </span>
                              {task.isMilestone && (
                                <span className="shrink-0 text-xs text-purple-500">◆</span>
                              )}
                              {/* Open task icon on hover */}
                              <button
                                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskId(task.id);
                                }}
                                title="Open Task page"
                                type="button"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500" />
                              </button>
                              {/* Add subitem icon on hover */}
                              <button
                                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedTasks((p) => new Set(p).add(task.id));
                                }}
                                title="Add subitem"
                                type="button"
                              >
                                <PlusCircle className="h-3.5 w-3.5 text-gray-400 hover:text-green-500" />
                              </button>
                            </div>
                          </div>

                          {/* Person (avatar) */}
                          <div
                            className="flex w-24 shrink-0 items-center justify-center px-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative">
                              {task.assignee ? (
                                <>
                                  <div
                                    className={cn(
                                      'flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white',
                                      getAvatarColor(task.assignee.name || task.assignee.email),
                                    )}
                                    title={task.assignee.name ?? task.assignee.email}
                                  >
                                    {initials(task.assignee.name || task.assignee.email)}
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
                                </>
                              ) : (
                                <div className="relative">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 dark:border-gray-600">
                                    <Plus className="h-3 w-3" />
                                  </div>
                                  <select
                                    className="absolute inset-0 cursor-pointer opacity-0"
                                    onChange={(e) =>
                                      updateTaskAssignee(task.id, e.target.value || null)
                                    }
                                    value=""
                                  >
                                    <option value="">Assign...</option>
                                    {members.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.name ?? m.email}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status (full cell color) */}
                          <div
                            className="flex w-28 shrink-0 items-center justify-center px-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative w-full">
                              <div
                                className={cn(
                                  'w-full rounded py-1.5 text-center text-xs font-semibold',
                                  STATUS_CELL[task.status] ?? STATUS_CELL.Todo,
                                )}
                              >
                                {task.status}
                              </div>
                              <select
                                className="absolute inset-0 cursor-pointer opacity-0"
                                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                                value={task.status}
                              >
                                <option value="Todo">Todo</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                              </select>
                            </div>
                          </div>

                          {/* Priority (full cell color) */}
                          <div className="flex w-24 shrink-0 items-center justify-center px-0.5">
                            {task.priority !== 'NONE' ? (
                              <span
                                className={cn(
                                  'w-full rounded py-1.5 text-center text-xs font-semibold',
                                  PRIORITY_CELL[task.priority],
                                )}
                              >
                                {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                              </span>
                            ) : (
                              <span className="w-full py-1.5 text-center text-xs text-gray-300 dark:text-gray-600">
                                —
                              </span>
                            )}
                          </div>

                          {/* Date */}
                          <div className="w-24 shrink-0 px-1 text-center text-xs text-gray-500 dark:text-gray-400">
                            {task.endDate ? format(new Date(task.endDate), 'MMM d') : ''}
                          </div>

                          {/* Project */}
                          <div className="flex w-32 shrink-0 items-center justify-center px-1">
                            {task.project && (
                              <span
                                className={cn(
                                  'truncate rounded px-2 py-1 text-[11px] font-semibold',
                                  getProjectColor(task.project.name),
                                )}
                              >
                                {task.project.name}
                              </span>
                            )}
                          </div>

                          {/* Comments */}
                          <div className="flex w-10 shrink-0 items-center justify-center">
                            {task._count.comments > 0 && (
                              <div className="flex items-center gap-0.5 text-gray-400">
                                <MessageSquare className="h-3 w-3" />
                                <span className="text-[10px]">{task._count.comments}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sub-items expansion */}
                        {isExpanded && (
                          <SubItemsSection
                            members={members}
                            parentTaskId={task.id}
                            workspaceId={workspaceId}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Add Item Row */}
                  <div className="border-b border-gray-100 dark:border-gray-800/50">
                    {addingInGroup === status ? (
                      <form
                        className="flex items-center py-1 pl-[72px] pr-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          createTask(status);
                        }}
                      >
                        <input
                          autoFocus
                          className="min-w-0 flex-1 bg-transparent py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
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
                          className="ml-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            setAddingInGroup(null);
                            setNewTaskTitle('');
                          }}
                          type="button"
                        >
                          ✕
                        </button>
                      </form>
                    ) : (
                      <button
                        className="flex w-full items-center gap-1.5 py-2 pl-[72px] text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

                  {/* Group Summary */}
                  {groupTasks.length > 0 && (
                    <div className="flex items-center border-b border-gray-200/60 bg-gray-50/50 text-[10px] text-gray-400 dark:border-gray-800/40 dark:bg-gray-900/20">
                      <div className="w-9 shrink-0" />
                      <div className="w-7 shrink-0" />
                      <div className="min-w-0 flex-1" />
                      <div className="w-24 shrink-0" />
                      <div className="flex w-28 shrink-0 items-center justify-center px-1">
                        <div className="flex h-1.5 w-full overflow-hidden rounded-full">
                          {(() => {
                            const d = groupTasks.filter((t) => t.status === 'Done').length;
                            const p = groupTasks.filter((t) => t.status === 'In Progress').length;
                            const o = groupTasks.length - d - p;
                            const n = groupTasks.length;
                            return (
                              <>
                                {d > 0 && (
                                  <div
                                    className="bg-green-500"
                                    style={{ width: `${(d / n) * 100}%` }}
                                  />
                                )}
                                {p > 0 && (
                                  <div
                                    className="bg-amber-400"
                                    style={{ width: `${(p / n) * 100}%` }}
                                  />
                                )}
                                {o > 0 && (
                                  <div
                                    className="bg-gray-300 dark:bg-gray-600"
                                    style={{ width: `${(o / n) * 100}%` }}
                                  />
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="w-24 shrink-0" />
                      <div className="w-24 shrink-0" />
                      <div className="w-32 shrink-0" />
                      <div className="w-10 shrink-0 py-1.5 text-center">
                        {groupTasks.length} {groupTasks.length === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Empty state */}
        {tasks.length === 0 && (
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

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          onAddSubitem={() => {
            setExpandedTasks((p) => new Set(p).add(contextMenu.taskId));
          }}
          onClose={() => setContextMenu(null)}
          onCreateBelow={() => {
            setAddingInGroup(contextMenu.status);
            setNewTaskTitle('');
          }}
          onDelete={() => setConfirmDelete(contextMenu.taskId)}
          onOpen={() => setSelectedTaskId(contextMenu.taskId)}
          position={{ x: contextMenu.x, y: contextMenu.y }}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Delete this task?</p>
            <p className="mt-1 text-xs text-gray-500">This action cannot be undone.</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => setConfirmDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                onClick={() => deleteTask(confirmDelete)}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task detail panel */}
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
