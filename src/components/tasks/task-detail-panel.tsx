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
  const [activeTab, setActiveTab] = useState<Tab>('timelog');
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
          {(['timelog', 'details', 'activity'] as Tab[]).map((tab) => (
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
      <DescriptionEditor
        content={task.description}
        onSave={(content) => updateField('description', content)}
      />

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

function DescriptionEditor({
  content,
  onSave,
}: {
  content: unknown;
  onSave: (content: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const hasContent =
    content &&
    typeof content === 'object' &&
    'content' in (content as Record<string, unknown>) &&
    Array.isArray((content as Record<string, unknown>).content) &&
    ((content as Record<string, unknown>).content as unknown[]).length > 0;

  if (editing) {
    return (
      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
          Description
        </h3>
        <div onBlur={() => setEditing(false)}>
          <TiptapEditor
            content={content}
            onChange={(c) => {
              onSave(c);
            }}
            placeholder="Write a description..."
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
        Description
      </h3>
      <div
        className="cursor-text rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900"
        onClick={() => setEditing(true)}
      >
        {hasContent ? (
          <TiptapEditor content={content} readOnly />
        ) : (
          <p className="italic text-gray-400 dark:text-gray-500">Click to add description...</p>
        )}
      </div>
    </section>
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
  interface TimeEntryData {
    id: string;
    duration: number;
    date: string;
    startTime: string | null;
    notes: string | null;
    billable: boolean;
    user: { name: string | null; email: string };
  }

  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [billableMinutes, setBillableMinutes] = useState(0);

  // Timer state — backed by ActiveTimer in database
  interface ActiveTimerData {
    id: string;
    startedAt: string;
    pausedAt: string | null;
    totalPaused: number;
    notes: string | null;
    billable: boolean;
    task: { id: string; title: string };
  }
  const [activeTimer, setActiveTimer] = useState<ActiveTimerData | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerNotes, setTimerNotes] = useState('');
  const [timerBillable, setTimerBillable] = useState(true);
  const [autoStopped, setAutoStopped] = useState(false);

  // Manual entry state
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualStart, setManualStart] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualBillable, setManualBillable] = useState(true);
  const [adding, setAdding] = useState(false);

  // Editing state
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState('');

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries);
      setTotalMinutes(data.totalMinutes);
      setBillableMinutes(
        data.entries
          .filter((e: TimeEntryData) => e.billable)
          .reduce((sum: number, e: TimeEntryData) => sum + e.duration, 0),
      );
    }
  }, [workspaceId, taskId]);

  // Fetch active timer from DB on mount
  const fetchActiveTimer = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/active-timer`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.task?.id === taskId) {
          setActiveTimer(data);
          setTimerRunning(true);
          setTimerPaused(!!data.pausedAt);
          setTimerNotes(data.notes || '');
          setTimerBillable(data.billable);
        } else {
          setActiveTimer(null);
          setTimerRunning(false);
          setTimerPaused(false);
        }
      }
    } catch {
      // ignore
    }
  }, [workspaceId, taskId]);

  useEffect(() => {
    fetchEntries();
    fetchActiveTimer();
  }, [fetchEntries, fetchActiveTimer]);

  // Timer tick — derives elapsed from server startedAt
  useEffect(() => {
    if (!timerRunning || timerPaused || !activeTimer) {
      return;
    }
    const interval = setInterval(() => {
      const startMs = new Date(activeTimer.startedAt).getTime();
      const pausedMs = activeTimer.totalPaused * 1000;
      const raw = Math.floor((Date.now() - startMs - pausedMs) / 1000);
      setElapsed(raw);
      if (raw >= 43200) {
        clearInterval(interval);
        stopTimer();
        setAutoStopped(true);
        setTimeout(() => setAutoStopped(false), 5000);
      }
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, timerPaused, activeTimer]);

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

  function formatTime(dateStr: string | null) {
    if (!dateStr) {
      return '';
    }
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  async function startTimer() {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/timer/start`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      setActiveTimer(data);
      setTimerRunning(true);
      setTimerPaused(false);
      setElapsed(0);
      setTimerNotes('');
      setTimerBillable(true);
      setAutoStopped(false);
      fetchEntries();
    }
  }

  async function pauseTimer() {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/timer/pause`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      setActiveTimer(data);
      setTimerPaused(true);
    }
  }

  async function resumeTimer() {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/timer/resume`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      setActiveTimer(data);
      setTimerPaused(false);
    }
  }

  async function stopTimer() {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/timer/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: timerNotes || null, billable: timerBillable }),
    });
    if (res.ok) {
      setActiveTimer(null);
      setTimerRunning(false);
      setTimerPaused(false);
      setElapsed(0);
      setTimerNotes('');
      setTimerBillable(true);
      fetchEntries();
    }
  }

  async function updateActiveTimerField(field: 'notes' | 'billable', value: string | boolean) {
    if (!activeTimer) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/timer`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function addManual() {
    const mins = parseInt(manualMinutes, 10);
    if (!mins || mins <= 0 || !manualDate) {
      return;
    }
    setAdding(true);
    const startTime =
      manualDate && manualStart ? new Date(`${manualDate}T${manualStart}`).toISOString() : null;
    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        duration: mins,
        date: new Date(manualDate).toISOString(),
        startTime,
        notes: manualNotes || null,
        billable: manualBillable,
      }),
    });
    setManualMinutes('');
    setManualStart('');
    setManualNotes('');
    setManualBillable(true);
    setAdding(false);
    fetchEntries();
  }

  async function toggleBillable(entryId: string, current: boolean) {
    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billable: !current }),
    });
    setEntries(entries.map((e) => (e.id === entryId ? { ...e, billable: !current } : e)));
    setBillableMinutes((prev) => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) {
        return prev;
      }
      return current ? prev - entry.duration : prev + entry.duration;
    });
  }

  async function saveEntryNotes(entryId: string, notes: string) {
    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notes || null }),
    });
    setEntries(entries.map((e) => (e.id === entryId ? { ...e, notes: notes || null } : e)));
    setEditingNotes(null);
  }

  async function deleteEntry(entryId: string) {
    await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}/time-entries/${entryId}`, {
      method: 'DELETE',
    });
    fetchEntries();
  }

  return (
    <div className="space-y-4 px-5 py-4">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
          Total: {formatDuration(totalMinutes)}
        </span>
        {billableMinutes > 0 && billableMinutes !== totalMinutes && (
          <span className="text-xs text-green-600 dark:text-green-400">
            ({formatDuration(billableMinutes)} billable)
          </span>
        )}
      </div>

      {autoStopped && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Timer auto-stopped after 12 hours
        </div>
      )}

      {/* Timer */}
      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          {timerRunning ? (
            <>
              <span
                className={cn(
                  'font-mono text-lg font-bold',
                  timerPaused
                    ? 'text-amber-500 dark:text-amber-400'
                    : 'text-blue-600 dark:text-blue-400',
                )}
              >
                {formatElapsed(elapsed)}
                {timerPaused && (
                  <span className="ml-1 text-xs font-normal">paused</span>
                )}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {timerPaused ? (
                  <Button onClick={resumeTimer} size="sm" variant="secondary">
                    Resume
                  </Button>
                ) : (
                  <Button onClick={pauseTimer} size="sm" variant="secondary">
                    Pause
                  </Button>
                )}
                <Button onClick={() => stopTimer()} size="sm" variant="danger">
                  Stop
                </Button>
              </div>
            </>
          ) : (
            <Button onClick={startTimer} size="sm">
              <Clock className="mr-1 h-3.5 w-3.5" />
              Start Timer
            </Button>
          )}
        </div>
        {timerRunning && (
          <div className="flex items-center gap-2">
            <button
              className={cn(
                'rounded px-1.5 py-0.5 text-xs font-bold transition-colors',
                timerBillable
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
              )}
              onClick={() => {
                const newVal = !timerBillable;
                setTimerBillable(newVal);
                if (activeTimer) {
                  updateActiveTimerField('billable', newVal);
                }
              }}
              title={timerBillable ? 'Billable — click to make non-billable' : 'Non-billable — click to make billable'}
              type="button"
            >
              $
            </button>
            <input
              className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              onBlur={() => {
                if (activeTimer) {
                  updateActiveTimerField('notes', timerNotes);
                }
              }}
              onChange={(e) => setTimerNotes(e.target.value)}
              placeholder="Add notes..."
              type="text"
              value={timerNotes}
            />
          </div>
        )}
      </div>

      {/* Manual entry */}
      <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Manual Entry</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-[120px] rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            onChange={(e) => setManualDate(e.target.value)}
            required
            type="date"
            value={manualDate}
          />
          <input
            className="w-[90px] rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            onChange={(e) => setManualStart(e.target.value)}
            placeholder="Start"
            type="time"
            value={manualStart}
          />
          <input
            className="w-[70px] rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            min="1"
            onChange={(e) => setManualMinutes(e.target.value)}
            placeholder="mins"
            type="number"
            value={manualMinutes}
          />
          <button
            className={cn(
              'rounded px-1.5 py-0.5 text-xs font-bold transition-colors',
              manualBillable
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
            )}
            onClick={() => setManualBillable(!manualBillable)}
            type="button"
          >
            $
          </button>
          <Button disabled={!manualMinutes || !manualDate} loading={adding} onClick={addManual} size="sm">
            Add
          </Button>
        </div>
        <input
          className="mt-1 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          onChange={(e) => setManualNotes(e.target.value)}
          placeholder="Notes (optional)..."
          type="text"
          value={manualNotes}
        />
      </div>

      {/* Entries list */}
      <div className="space-y-1">
        {entries.map((e) => (
          <div
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900"
            key={e.id}
          >
            <span className="w-12 shrink-0 text-xs text-gray-400 dark:text-gray-500">
              {formatDate(e.date)}
            </span>
            {e.startTime && (
              <span className="w-14 shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {formatTime(e.startTime)}
              </span>
            )}
            <span className="w-14 shrink-0 text-sm font-medium text-gray-900 dark:text-white">
              {formatDuration(e.duration)}
            </span>
            <div className="min-w-0 flex-1">
              {editingNotes === e.id ? (
                <input
                  autoFocus
                  className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs dark:border-blue-700 dark:bg-gray-800 dark:text-white"
                  defaultValue={e.notes ?? ''}
                  onBlur={(ev) => saveEntryNotes(e.id, ev.target.value)}
                  onChange={(ev) => setEditNotesValue(ev.target.value)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') {
                      saveEntryNotes(e.id, (ev.target as HTMLInputElement).value);
                    }
                    if (ev.key === 'Escape') {
                      setEditingNotes(null);
                    }
                  }}
                  type="text"
                />
              ) : (
                <span
                  className={cn(
                    'cursor-pointer text-xs',
                    e.notes
                      ? 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      : 'italic text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400',
                  )}
                  onClick={() => {
                    setEditingNotes(e.id);
                    setEditNotesValue(e.notes ?? '');
                  }}
                >
                  {e.notes || 'Add note...'}
                </span>
              )}
            </div>
            <button
              className={cn(
                'rounded px-1.5 py-0.5 text-xs font-bold transition-colors',
                e.billable
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500',
              )}
              onClick={() => toggleBillable(e.id, e.billable)}
              title={e.billable ? 'Billable — click to make non-billable' : 'Non-billable — click to make billable'}
              type="button"
            >
              $
            </button>
            <button
              className="text-xs text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
              onClick={() => deleteEntry(e.id)}
              title="Delete entry"
            >
              &times;
            </button>
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
