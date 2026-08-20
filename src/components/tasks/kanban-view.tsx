'use client';

import { GripVertical, Info, ListChecks, MessageSquare, Plus } from 'lucide-react';
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

  // Drag-and-drop state
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragSourceCol, setDragSourceCol] = useState<string | null>(null);
  const [dropTargetCol, setDropTargetCol] = useState<string | null>(null);
  const [dropTargetTaskId, setDropTargetTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null);
  const dragCountRef = useRef<Record<string, number>>({});

  async function patchTask(taskId: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    }
  }

  async function reorderColumn(colTasks: TaskData[], fromIndex: number, toIndex: number) {
    const reordered = [...colTasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const orderedIds = reordered.map((t) => t.id);

    const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
    setTasks((prev) => {
      const others = prev.filter((t) => !orderMap.has(t.id));
      const sorted = [...prev.filter((t) => orderMap.has(t.id))].sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0),
      );
      return [...sorted, ...others];
    });

    await fetch(`/api/workspaces/${workspaceId}/tasks/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
  }

  function handleDrop(targetColName: string, targetColTasks: TaskData[], targetIndex: number | null) {
    if (!dragTaskId) return;

    const sameCol = dragSourceCol === targetColName;
    const fromIndex = targetColTasks.findIndex((t) => t.id === dragTaskId);

    if (sameCol && fromIndex !== -1) {
      let toIndex = targetIndex ?? targetColTasks.length - 1;
      if (dropPosition === 'below' && targetIndex !== null) toIndex += 1;
      if (fromIndex < toIndex) toIndex -= 1;
      if (fromIndex !== toIndex) {
        reorderColumn(targetColTasks, fromIndex, toIndex);
      }
    } else if (!sameCol) {
      setTasks((prev) => prev.map((t) => (t.id === dragTaskId ? { ...t, status: targetColName } : t)));
      patchTask(dragTaskId, { status: targetColName });
    }

    setDragTaskId(null);
    setDragSourceCol(null);
    setDropTargetCol(null);
    setDropTargetTaskId(null);
    setDropPosition(null);
  }

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {columns.map((col) => (
        <div
          className={cn(
            'flex w-80 shrink-0 flex-col rounded-lg transition-shadow',
            dropTargetCol === col.name && dragSourceCol !== col.name && 'ring-2 ring-blue-400',
          )}
          key={col.name}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTargetCol(col.name);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            dragCountRef.current[col.name] = (dragCountRef.current[col.name] || 0) + 1;
            setDropTargetCol(col.name);
          }}
          onDragLeave={() => {
            dragCountRef.current[col.name] = (dragCountRef.current[col.name] || 0) - 1;
            if (dragCountRef.current[col.name] <= 0) {
              dragCountRef.current[col.name] = 0;
              if (dropTargetCol === col.name) {
                setDropTargetCol(null);
              }
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            dragCountRef.current[col.name] = 0;
            const targetIndex = dropTargetTaskId
              ? col.tasks.findIndex((t) => t.id === dropTargetTaskId)
              : null;
            handleDrop(col.name, col.tasks, targetIndex);
          }}
        >
          {/* Column header */}
          <div
            className="flex items-center gap-2 rounded-t-lg px-4 py-2.5"
            style={{ backgroundColor: col.color }}
          >
            <span className="text-sm font-bold text-white">{col.name}</span>
            <span className="text-sm font-medium text-white/80">{col.tasks.length}</span>
          </div>

          {/* Cards */}
          <div className={cn(
            'flex-1 space-y-2 overflow-y-auto bg-gray-50 p-2 dark:bg-gray-900/50',
            col.tasks.length === 0 && dropTargetCol === col.name && 'min-h-[60px] ring-2 ring-inset ring-blue-300 rounded',
          )}>
            {col.tasks.map((task) => {
              const isDragging = dragTaskId === task.id;
              const isDropTarget = dropTargetTaskId === task.id && dragTaskId !== task.id;

              return (
              <div
                className={cn(
                  'group cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800',
                  isDragging && 'opacity-40',
                  isDropTarget && dropPosition === 'above' && 'border-t-2 border-t-blue-500',
                  isDropTarget && dropPosition === 'below' && 'border-b-2 border-b-blue-500',
                )}
                draggable
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDragTaskId(task.id);
                  setDragSourceCol(col.name);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', task.id);
                }}
                onDragEnd={() => {
                  setDragTaskId(null);
                  setDragSourceCol(null);
                  setDropTargetCol(null);
                  setDropTargetTaskId(null);
                  setDropPosition(null);
                  dragCountRef.current = {};
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragTaskId === task.id) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const midY = rect.top + rect.height / 2;
                  setDropTargetTaskId(task.id);
                  setDropPosition(e.clientY < midY ? 'above' : 'below');
                }}
                onDragLeave={(e) => {
                  e.stopPropagation();
                  if (dropTargetTaskId === task.id) {
                    setDropTargetTaskId(null);
                    setDropPosition(null);
                  }
                }}
              >
                {/* Title row with drag handle */}
                <div className="flex items-start gap-1">
                  <div className="mt-0.5 shrink-0 cursor-grab text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing dark:text-gray-600">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                  <p className="min-w-0 flex-1 text-sm font-semibold text-gray-900 leading-snug dark:text-white">
                    {task.title}
                  </p>
                </div>

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
              );
            })}
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
