'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CheckSquare,
  Clock,
  Diamond,
  FileIcon,
  FolderKanban,
  Plus,
  Send,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { TiptapEditor } from '@/components/editor/tiptap-editor';
import { CustomFieldRenderer } from '@/components/tasks/custom-field-renderer';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface SubTask {
  id: string;
  title: string;
  status: string;
  assignee: TaskUser | null;
  _count: { subTasks: number };
}

interface Dependency {
  id: string;
  type: string;
  mode: string;
  dependsOn: { id: string; title: string; status: string };
}

interface FileData {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface CommentData {
  id: string;
  content: unknown;
  createdAt: string;
  user: TaskUser;
}

interface FullTask {
  id: string;
  title: string;
  description: unknown;
  status: string;
  priority: string;
  assignee: TaskUser | null;
  createdBy: { id: string; name: string | null; email: string };
  project: { id: string; name: string } | null;
  startDate: string | null;
  endDate: string | null;
  timeEstimate: number | null;
  isMilestone: boolean;
  completedAt: string | null;
  createdAt: string;
  lastActivityAt: string;
  subTasks: SubTask[];
  dependsOn: Dependency[];
  dependedOnBy: Array<{
    id: string;
    type: string;
    task: { id: string; title: string; status: string };
  }>;
  files: FileData[];
  taskLabels: Array<{ label: { id: string; name: string; color: string } }>;
  _count: { comments: number; subTasks: number };
}

interface TaskDetailPanelProps {
  taskId: string;
  workspaceId: string;
  members: TaskUser[];
  projects: Array<{ id: string; name: string }>;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

type Tab = 'details' | 'activity' | 'timelog';

export function TaskDetailPanel({
  members,
  onClose,
  onTaskUpdated,
  projects,
  taskId,
  workspaceId,
}: TaskDetailPanelProps) {
  const [task, setTask] = useState<FullTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const fetchTask = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`);
    if (res.ok) {
      const data = await res.json();
      setTask(data);
      setTitleValue(data.title);
    }
    setLoading(false);
  }, [workspaceId, taskId]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments`);
    if (res.ok) {
      setComments(await res.json());
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchTask(), fetchComments()]);
    };
    load();
  }, [fetchTask, fetchComments]);

  async function updateField(field: string, value: unknown) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask((prev) => (prev ? { ...prev, ...updated } : prev));
      onTaskUpdated?.();
    }
  }

  async function saveTitle() {
    if (titleValue.trim() && titleValue !== task?.title) {
      await updateField('title', titleValue.trim());
    }
    setEditingTitle(false);
  }

  async function addComment() {
    if (!newComment.trim()) {
      return;
    }
    setSendingComment(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { type: 'text', text: newComment.trim() } }),
    });
    if (res.ok) {
      setNewComment('');
      fetchComments();
    }
    setSendingComment(false);
  }

  async function addSubTask() {
    if (!newSubTaskTitle.trim()) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newSubTaskTitle.trim(),
        parentTaskId: taskId,
        projectId: task?.project?.id,
      }),
    });
    if (res.ok) {
      setNewSubTaskTitle('');
      fetchTask();
      onTaskUpdated?.();
    }
  }

  if (loading) {
    return (
      <Panel onClose={onClose}>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </Panel>
    );
  }

  if (!task) {
    return (
      <Panel onClose={onClose}>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-red-500">Task not found</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel onClose={onClose}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-start justify-between">
            {editingTitle ? (
              <input
                autoFocus
                className="flex-1 rounded border border-blue-500 bg-transparent px-1 text-lg font-semibold text-gray-900 focus:outline-none dark:text-white"
                onBlur={saveTitle}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveTitle();
                  }
                }}
                value={titleValue}
              />
            ) : (
              <h2
                className="flex-1 cursor-text text-lg font-semibold text-gray-900 dark:text-white"
                onClick={() => setEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}
            <button
              className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick fields */}
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              onChange={(e) => updateField('status', e.target.value)}
              value={task.status}
            >
              <option value="Todo">Todo</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            <select
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              onChange={(e) => updateField('priority', e.target.value)}
              value={task.priority}
            >
              <option value="NONE">No priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <select
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              onChange={(e) => updateField('assigneeId', e.target.value || null)}
              value={task.assignee?.id ?? ''}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name ?? m.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5 dark:border-gray-700">
          {(['details', 'activity', 'timelog'] as Tab[]).map((tab) => (
            <button
              className={cn(
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              )}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab === 'details' ? 'Details' : tab === 'activity' ? 'Activity' : 'Time Log'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <DetailsTab
              addSubTask={addSubTask}
              members={members}
              newSubTaskTitle={newSubTaskTitle}
              projects={projects}
              setNewSubTaskTitle={setNewSubTaskTitle}
              task={task}
              taskId={taskId}
              updateField={updateField}
              workspaceId={workspaceId}
            />
          )}
          {activeTab === 'activity' && (
            <ActivityTab
              addComment={addComment}
              comments={comments}
              newComment={newComment}
              sendingComment={sendingComment}
              setNewComment={setNewComment}
            />
          )}
          {activeTab === 'timelog' && (
            <TimeLogTab taskId={taskId} workspaceId={workspaceId} />
          )}
        </div>
      </div>
    </Panel>
  );
}

function Panel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-hidden border-l border-gray-200 bg-white shadow-xl transition-transform sm:w-[480px] dark:border-gray-700 dark:bg-gray-950">
        {children}
      </div>
    </>
  );
}

function DetailsTab({
  addSubTask,
  members,
  newSubTaskTitle,
  projects,
  setNewSubTaskTitle,
  task,
  taskId,
  updateField,
  workspaceId,
}: {
  task: FullTask;
  updateField: (field: string, value: unknown) => void;
  projects: Array<{ id: string; name: string }>;
  members: TaskUser[];
  workspaceId: string;
  taskId: string;
  newSubTaskTitle: string;
  setNewSubTaskTitle: (v: string) => void;
  addSubTask: () => void;
}) {
  return (
    <div className="space-y-5 px-5 py-4">
      {/* Description */}
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
          Description
        </h3>
        <TiptapEditor
          content={task.description}
          onChange={(content) => updateField('description', content)}
        />
      </section>

      {/* Fields */}
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
          Fields
        </h3>
        <div className="space-y-2">
          <FieldRow icon={FolderKanban} label="Project">
            <select
              className="w-full rounded border-0 bg-transparent py-0.5 text-sm text-gray-700 dark:text-gray-300"
              onChange={(e) => updateField('projectId', e.target.value || null)}
              value={task.project?.id ?? ''}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow icon={Calendar} label="Start Date">
            <input
              className="w-full rounded border-0 bg-transparent py-0.5 text-sm text-gray-700 dark:text-gray-300"
              onChange={(e) =>
                updateField(
                  'startDate',
                  e.target.value ? new Date(e.target.value).toISOString() : null,
                )
              }
              type="date"
              value={task.startDate ? task.startDate.split('T')[0] : ''}
            />
          </FieldRow>
          <FieldRow icon={Calendar} label="End Date">
            <input
              className="w-full rounded border-0 bg-transparent py-0.5 text-sm text-gray-700 dark:text-gray-300"
              onChange={(e) =>
                updateField(
                  'endDate',
                  e.target.value ? new Date(e.target.value).toISOString() : null,
                )
              }
              type="date"
              value={task.endDate ? task.endDate.split('T')[0] : ''}
            />
          </FieldRow>
          <FieldRow icon={Diamond} label="Milestone">
            <button
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                task.isMilestone ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700',
              )}
              onClick={() => updateField('isMilestone', !task.isMilestone)}
              type="button"
            >
              <span
                className={cn(
                  'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                  task.isMilestone ? 'translate-x-4' : 'translate-x-0.5',
                )}
              />
            </button>
          </FieldRow>
          <FieldRow icon={Clock} label="Estimate">
            <input
              className="w-20 rounded border-0 bg-transparent py-0.5 text-sm text-gray-700 dark:text-gray-300"
              min="0"
              onBlur={(e) =>
                updateField('timeEstimate', e.target.value ? parseInt(e.target.value, 10) : null)
              }
              defaultValue={task.timeEstimate ?? ''}
              placeholder="hours"
              type="number"
            />
            <span className="text-xs text-gray-400">hours</span>
          </FieldRow>
        </div>
      </section>

      {/* Sub-tasks */}
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
          Sub-tasks ({task.subTasks.length})
        </h3>
        <div className="space-y-1">
          {task.subTasks.map((st) => (
            <div
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900"
              key={st.id}
            >
              <CheckSquare
                className={cn(
                  'h-4 w-4',
                  st.status === 'Done' ? 'text-green-500' : 'text-gray-300 dark:text-gray-600',
                )}
              />
              <span
                className={cn(
                  'flex-1 text-sm',
                  st.status === 'Done'
                    ? 'text-gray-400 line-through dark:text-gray-500'
                    : 'text-gray-900 dark:text-white',
                )}
              >
                {st.title}
              </span>
              {st.assignee && (
                <span className="text-xs text-gray-400">
                  {st.assignee.name ?? st.assignee.email}
                </span>
              )}
            </div>
          ))}
          <form
            className="flex items-center gap-2 px-2"
            onSubmit={(e) => {
              e.preventDefault();
              addSubTask();
            }}
          >
            <Plus className="h-3.5 w-3.5 text-gray-400" />
            <input
              className="flex-1 bg-transparent py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white dark:placeholder-gray-500"
              onChange={(e) => setNewSubTaskTitle(e.target.value)}
              placeholder="Add sub-task..."
              type="text"
              value={newSubTaskTitle}
            />
          </form>
        </div>
      </section>

      {/* Dependencies */}
      {(task.dependsOn.length > 0 || task.dependedOnBy.length > 0) && (
        <section>
          <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
            Dependencies
          </h3>
          <div className="space-y-1">
            {task.dependsOn.map((dep) => (
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm" key={dep.id}>
                <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-gray-500 dark:text-gray-400">Blocked by:</span>
                <span className="text-gray-900 dark:text-white">{dep.dependsOn.title}</span>
                <span className="text-xs text-gray-400">({dep.type})</span>
              </div>
            ))}
            {task.dependedOnBy.map((dep) => (
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm" key={dep.id}>
                <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-gray-500 dark:text-gray-400">Blocking:</span>
                <span className="text-gray-900 dark:text-white">{dep.task.title}</span>
                <span className="text-xs text-gray-400">({dep.type})</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Custom Fields */}
      <CustomFieldsSection members={members} taskId={taskId} workspaceId={workspaceId} />

      {/* Files */}
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
          Files ({task.files.length})
        </h3>
        {task.files.length > 0 ? (
          <div className="space-y-1">
            {task.files.map((f) => (
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm" key={f.id}>
                <FileIcon className="h-4 w-4 text-gray-400" />
                <span className="flex-1 text-gray-900 dark:text-white">{f.name}</span>
                <span className="text-xs text-gray-400">{(f.size / 1024).toFixed(1)}KB</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-2 text-xs text-gray-400 dark:text-gray-500">
            File storage not configured. Contact your administrator to set up Cloudflare R2.
          </p>
        )}
      </section>

      {/* Meta */}
      <section className="border-t border-gray-100 pt-3 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Created by {task.createdBy.name ?? task.createdBy.email}{' '}
          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
        </p>
      </section>
    </div>
  );
}

function FieldRow({
  children,
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1">
      <div className="flex w-28 items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex flex-1 items-center gap-1">{children}</div>
    </div>
  );
}

function ActivityTab({
  addComment,
  comments,
  newComment,
  sendingComment,
  setNewComment,
}: {
  comments: CommentData[];
  newComment: string;
  setNewComment: (v: string) => void;
  addComment: () => void;
  sendingComment: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {comments.length === 0 && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">No activity yet</p>
        )}
        {comments.map((c) => {
          const isSystem =
            typeof c.content === 'object' &&
            c.content !== null &&
            'type' in c.content &&
            (c.content as Record<string, unknown>).type === 'system';
          return (
            <div className="flex gap-3" key={c.id}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {c.user.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {c.user.name ?? c.user.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p
                  className={cn(
                    'mt-0.5 text-sm',
                    isSystem
                      ? 'text-gray-500 italic dark:text-gray-400'
                      : 'text-gray-700 dark:text-gray-300',
                  )}
                >
                  {typeof c.content === 'object' && c.content !== null && 'text' in c.content
                    ? String((c.content as Record<string, unknown>).text)
                    : typeof c.content === 'string'
                      ? c.content
                      : JSON.stringify(c.content)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-200 px-5 py-3 dark:border-gray-700">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addComment();
          }}
        >
          <input
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            disabled={sendingComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            value={newComment}
          />
          <Button disabled={!newComment.trim()} loading={sendingComment} size="sm" type="submit">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function TimeLogTab({ taskId, workspaceId }: { taskId: string; workspaceId: string }) {
  const [entries, setEntries] = useState<
    Array<{
      id: string;
      duration: number;
      date: string;
      notes: string | null;
      billable: boolean;
      user: { name: string | null; email: string };
    }>
  >([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [billable, setBillable] = useState(true);
  const [adding, setAdding] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotalMinutes(data.totalMinutes);
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useEffect(() => {
    if (!timerRunning || !timerStart) {
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timerStart) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerStart]);

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function formatDuration(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) {
      return `${m}m`;
    }
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  async function startTimer() {
    setTimerRunning(true);
    setTimerStart(Date.now());
    setElapsed(0);
  }

  async function stopTimer() {
    if (!timerStart) {
      return;
    }
    const mins = Math.max(1, Math.round((Date.now() - timerStart) / 60000));
    setTimerRunning(false);
    setTimerStart(null);
    setElapsed(0);

    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: mins, billable: true }),
    });
    fetchEntries();
  }

  async function addManual() {
    const mins = parseInt(duration, 10);
    if (!mins || mins <= 0) {
      return;
    }
    setAdding(true);
    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration: mins, notes: notes || null, billable }),
    });
    setDuration('');
    setNotes('');
    setBillable(true);
    setAdding(false);
    fetchEntries();
  }

  async function deleteEntry(entryId: string) {
    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries/${entryId}`, {
      method: 'DELETE',
    });
    fetchEntries();
  }

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
          Total: {formatDuration(totalMinutes)}
        </h3>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        {timerRunning ? (
          <>
            <span className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatElapsed(elapsed)}
            </span>
            <Button onClick={stopTimer} size="sm" variant="danger">
              Stop
            </Button>
          </>
        ) : (
          <Button onClick={startTimer} size="sm">
            <Clock className="mr-1 h-3.5 w-3.5" />
            Start Timer
          </Button>
        )}
      </div>

      {/* Manual entry */}
      <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Manual Entry</p>
        <div className="flex items-center gap-2">
          <input
            className="w-20 rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            min="1"
            onChange={(e) => setDuration(e.target.value)}
            placeholder="mins"
            type="number"
            value={duration}
          />
          <input
            className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes..."
            type="text"
            value={notes}
          />
          <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <input
              checked={billable}
              onChange={(e) => setBillable(e.target.checked)}
              type="checkbox"
            />
            $
          </label>
          <Button disabled={!duration} loading={adding} onClick={addManual} size="sm">
            Add
          </Button>
        </div>
      </div>

      {/* Entries list */}
      <div className="space-y-1">
        {entries.map((e) => (
          <div
            className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900"
            key={e.id}
          >
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDuration(e.duration)}
              </span>
              {e.notes && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{e.notes}</span>
              )}
              {e.billable && (
                <span className="ml-1 text-xs text-green-600 dark:text-green-400">$</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {e.user.name ?? e.user.email} &middot;{' '}
                {formatDistanceToNow(new Date(e.date), { addSuffix: true })}
              </span>
              <button
                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                onClick={() => deleteEntry(e.id)}
              >
                &times;
              </button>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
            No time logged yet
          </p>
        )}
      </div>
    </div>
  );
}

function CustomFieldsSection({
  members,
  taskId,
  workspaceId,
}: {
  workspaceId: string;
  taskId: string;
  members: TaskUser[];
}) {
  const [definitions, setDefinitions] = useState<
    Array<{ id: string; name: string; type: string; config: Record<string, unknown> }>
  >([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [defsRes, valsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/custom-fields`),
        fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/field-values`),
      ]);
      if (defsRes.ok) {
        setDefinitions(await defsRes.json());
      }
      if (valsRes.ok) {
        const data = await valsRes.json();
        const map: Record<string, unknown> = {};
        for (const v of data) {
          map[v.customFieldDefinitionId] = v.value;
        }
        setValues(map);
      }
      setLoaded(true);
    };
    load();
  }, [workspaceId, taskId]);

  async function saveFieldValue(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/field-values`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldId, value }),
    });
  }

  if (!loaded || definitions.length === 0) {
    return null;
  }

  const allNamedValues: Record<string, unknown> = {};
  for (const def of definitions) {
    allNamedValues[def.name] = values[def.id] ?? null;
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
        Custom Fields
      </h3>
      <div className="space-y-2">
        {definitions.map((def) => (
          <div className="flex items-start gap-3 rounded-lg px-2 py-1" key={def.id}>
            <span className="w-28 shrink-0 pt-1 text-xs text-gray-500 dark:text-gray-400">
              {def.name}
            </span>
            <div className="flex-1">
              <CustomFieldRenderer
                allValues={allNamedValues}
                definition={def}
                members={members}
                onChange={(v) => saveFieldValue(def.id, v)}
                value={values[def.id] ?? null}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
