'use client';

import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, MessageSquare, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
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

interface TaskTableViewProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  slug: string;
  members: TaskUser[];
}

const priorityColors: Record<string, string> = {
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  NONE: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const statusColors: Record<string, string> = {
  Done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Todo: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function TaskTableView({
  members,
  projectId,
  tasks: initialTasks,
  workspaceId,
}: TaskTableViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  async function createTask() {
    if (!newTaskTitle.trim()) {
      return;
    }
    setAddingTask(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          projectId: projectId || undefined,
        }),
      });

      if (res.ok) {
        const task = await res.json();
        setTasks([...tasks, task]);
        setNewTaskTitle('');
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setAddingTask(false);
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

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Task
            </th>
            <th className="w-32 px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Status
            </th>
            <th className="w-28 px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Priority
            </th>
            <th className="w-36 px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Assignee
            </th>
            <th className="w-28 px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
              Due
            </th>
            <th className="w-16 px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {tasks.map((task) => (
            <tr
              className={cn(
                'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900',
                selectedTaskId === task.id && 'bg-blue-50 dark:bg-blue-900/20',
              )}
              key={task.id}
              onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
            >
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {task._count.subTasks > 0 && (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {task.title}
                  </span>
                  {task.isMilestone && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">◆</span>
                  )}
                  {task.taskLabels.map((tl) => (
                    <span
                      className="rounded px-1.5 py-0.5 text-xs"
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
              </td>
              <td className="px-4 py-2.5">
                <select
                  className={cn(
                    'cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium',
                    statusColors[task.status] ??
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                  )}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateTaskStatus(task.id, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  value={task.status}
                >
                  <option value="Todo">Todo</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    priorityColors[task.priority] ?? priorityColors.NONE,
                  )}
                >
                  {task.priority === 'NONE' ? '-' : task.priority.toLowerCase()}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <select
                  className="w-full cursor-pointer rounded border-0 bg-transparent py-0.5 text-xs text-gray-700 dark:text-gray-300"
                  onChange={(e) => {
                    e.stopPropagation();
                    updateTaskAssignee(task.id, e.target.value || null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  value={task.assignee?.id ?? ''}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name ?? m.email}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2.5">
                {task.endDate && (
                  <span
                    className={cn(
                      'text-xs',
                      new Date(task.endDate) < new Date()
                        ? 'font-medium text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400',
                    )}
                  >
                    {formatDistanceToNow(new Date(task.endDate), { addSuffix: true })}
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {task._count.comments > 0 && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="text-xs">{task._count.comments}</span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-800">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createTask();
          }}
        >
          <Plus className="h-4 w-4 text-gray-400" />
          <input
            className="flex-1 bg-transparent py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white dark:placeholder-gray-500"
            disabled={addingTask}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task..."
            type="text"
            value={newTaskTitle}
          />
          {newTaskTitle.trim() && (
            <Button loading={addingTask} size="sm" type="submit">
              Add
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
