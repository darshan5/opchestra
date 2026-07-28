'use client';

import { format } from 'date-fns';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Info,
  MessageSquare,
  MoreHorizontal,
  Plus,
  PlusCircle,
  Trash2,
  X,
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

interface TaskGroupData {
  id: string;
  name: string;
  color: string;
}

interface PhaseData {
  id: string;
  name: string;
  color: string;
}

interface TaskData {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: TaskUser | null;
  project: { id: string; name: string } | null;
  taskGroup?: TaskGroupData | null;
  phase?: { id: string; name: string; color: string } | null;
  ticketCompany?: { id: string; name: string } | null;
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

type GroupByOption = 'group' | 'status' | 'priority' | 'person' | 'project' | 'phase' | 'company';

interface TaskTableViewProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  taskGroupId?: string;
  slug: string;
  members: TaskUser[];
  projects?: Array<{ id: string; name: string }>;
  taskGroups?: TaskGroupData[];
  phases?: PhaseData[];
  groupBy?: GroupByOption;
  currentUserRole?: string;
  initialOpenTaskId?: string;
}

// ── Column Definitions ──────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  defaultWidth: number;
  minWidth: number;
  resizable: boolean;
  hideable: boolean;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: 'task', label: 'Task', defaultWidth: 0, minWidth: 200, resizable: false, hideable: false },
  { key: 'person', label: 'Person', defaultWidth: 96, minWidth: 60, resizable: true, hideable: true },
  { key: 'status', label: 'Status', defaultWidth: 112, minWidth: 80, resizable: true, hideable: true },
  { key: 'priority', label: 'Priority', defaultWidth: 96, minWidth: 60, resizable: true, hideable: true },
  { key: 'date', label: 'Date', defaultWidth: 96, minWidth: 60, resizable: true, hideable: true },
  { key: 'project', label: 'Project', defaultWidth: 128, minWidth: 80, resizable: true, hideable: true },
  { key: 'company', label: 'Company', defaultWidth: 128, minWidth: 80, resizable: true, hideable: true },
  { key: 'group', label: 'Group', defaultWidth: 112, minWidth: 80, resizable: true, hideable: true },
  { key: 'phase', label: 'Phase', defaultWidth: 112, minWidth: 80, resizable: true, hideable: true },
  { key: 'comments', label: '', defaultWidth: 40, minWidth: 40, resizable: false, hideable: false },
];

function getDefaultVisibleColumns(context: { projectId?: string; taskGroupId?: string }): string[] {
  const cols = ['task', 'person', 'status', 'priority', 'date', 'project', 'company', 'comments'];
  if (context.projectId) {
    // In project view: hide Project (redundant) and Phase (shown as sections)
    return cols.filter(c => c !== 'project');
  }
  if (context.taskGroupId) {
    // In group view: hide Group (redundant)
    return cols.filter(c => c !== 'group');
  }
  return cols;
}

function loadColumnState(storageKey: string, defaults: string[]): { visible: string[]; widths: Record<string, number> } {
  if (typeof window === 'undefined') {
    return { visible: defaults, widths: {} };
  }
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { visible: parsed.visible || defaults, widths: parsed.widths || {} };
    }
  } catch { /* ignore */ }
  return { visible: defaults, widths: {} };
}

function saveColumnState(storageKey: string, visible: string[], widths: Record<string, number>) {
  if (typeof window === 'undefined') { return; }
  try {
    localStorage.setItem(storageKey, JSON.stringify({ visible, widths }));
  } catch { /* ignore */ }
}

const STATUS_ORDER = ['Todo', 'In Progress', 'Done'];

const STATUS_CELL: Record<string, string> = {
  Done: 'bg-green-500 text-white',
  'In Progress': 'bg-amber-400 text-white',
  Todo: 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200',
};

const PRIORITY_CELL: Record<string, string> = {
  HIGH: 'bg-orange-400 text-white',
  LOW: 'bg-blue-300 text-white',
  MEDIUM: 'bg-yellow-300 text-gray-800',
  NONE: '',
  URGENT: 'bg-red-500 text-white',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-600', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-cyan-500', 'bg-emerald-600',
];

const PROJECT_COLORS = [
  'bg-blue-500 text-white', 'bg-orange-400 text-white', 'bg-green-500 text-white',
  'bg-purple-500 text-white', 'bg-red-400 text-white', 'bg-teal-500 text-white',
  'bg-pink-500 text-white', 'bg-indigo-500 text-white',
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

function groupTasksBy(
  tasks: TaskData[],
  mode: GroupByOption,
  _members: TaskUser[],
): { groups: Record<string, TaskData[]>; colors: Record<string, string> } {
  const groups: Record<string, TaskData[]> = {};
  const colors: Record<string, string> = {};

  if (mode === 'status') {
    for (const status of STATUS_ORDER) {
      groups[status] = [];
    }
    for (const task of tasks) {
      const key = STATUS_ORDER.includes(task.status) ? task.status : 'Todo';
      groups[key].push(task);
    }
    colors['Todo'] = '#9CA3AF';
    colors['In Progress'] = '#F59E0B';
    colors['Done'] = '#10B981';
  } else if (mode === 'group') {
    for (const task of tasks) {
      const key = task.taskGroup?.name ?? 'Ungrouped';
      if (!groups[key]) {
        groups[key] = [];
        colors[key] = task.taskGroup?.color ?? '#9CA3AF';
      }
      groups[key].push(task);
    }
    if (!groups['Ungrouped']) {
      groups['Ungrouped'] = [];
      colors['Ungrouped'] = '#9CA3AF';
    }
  } else if (mode === 'priority') {
    const order = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];
    const pColors: Record<string, string> = {
      HIGH: '#F97316', LOW: '#3B82F6', MEDIUM: '#EAB308', NONE: '#9CA3AF', URGENT: '#EF4444',
    };
    for (const p of order) {
      groups[p] = [];
    }
    for (const task of tasks) {
      const key = order.includes(task.priority) ? task.priority : 'NONE';
      groups[key].push(task);
      colors[key] = pColors[key];
    }
  } else if (mode === 'person') {
    for (const task of tasks) {
      const key = task.assignee?.name ?? task.assignee?.email ?? 'Unassigned';
      if (!groups[key]) {
        groups[key] = [];
        colors[key] = '#6366F1';
      }
      groups[key].push(task);
    }
    if (!groups['Unassigned']) {
      groups['Unassigned'] = [];
      colors['Unassigned'] = '#9CA3AF';
    }
  } else if (mode === 'project') {
    for (const task of tasks) {
      const key = task.project?.name ?? 'No Project';
      if (!groups[key]) {
        groups[key] = [];
        colors[key] = '#3B82F6';
      }
      groups[key].push(task);
    }
    if (!groups['No Project']) {
      groups['No Project'] = [];
      colors['No Project'] = '#9CA3AF';
    }
  } else if (mode === 'company') {
    for (const task of tasks) {
      const key = task.ticketCompany?.name ?? 'No Company';
      if (!groups[key]) {
        groups[key] = [];
        colors[key] = '#8B5CF6';
      }
      groups[key].push(task);
    }
    if (!groups['No Company']) {
      groups['No Company'] = [];
      colors['No Company'] = '#9CA3AF';
    }
  } else if (mode === 'phase') {
    for (const task of tasks) {
      const key = task.phase?.name ?? 'No Phase Assigned';
      if (!groups[key]) {
        groups[key] = [];
        colors[key] = task.phase?.color ?? '#9CA3AF';
      }
      groups[key].push(task);
    }
    if (!groups['No Phase Assigned']) {
      groups['No Phase Assigned'] = [];
      colors['No Phase Assigned'] = '#9CA3AF';
    }
    // Move "No Phase Assigned" to end
    const noPhase = groups['No Phase Assigned'];
    delete groups['No Phase Assigned'];
    groups['No Phase Assigned'] = noPhase;
  } else {
    groups['All'] = [...tasks];
    colors['All'] = '#6B7280';
  }

  return { colors, groups };
}

// ── Context Menu ─────────────────────────────────────────────

function ContextMenu({
  onAddSubitem,
  onClose,
  onCreateBelow,
  onDelete,
  onMoveToGroup,
  onMoveToPhase,
  onOpen,
  phases,
  position,
  taskGroups,
}: {
  onClose: () => void;
  onOpen: () => void;
  onCreateBelow: () => void;
  onAddSubitem: () => void;
  onDelete: () => void;
  onMoveToPhase?: (phaseId: string) => void;
  onMoveToGroup?: (groupId: string) => void;
  phases?: PhaseData[];
  taskGroups?: TaskGroupData[];
  position: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showPhaseSub, setShowPhaseSub] = useState(false);
  const [showGroupSub, setShowGroupSub] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900"
      ref={ref}
      style={{ left: position.x, top: position.y }}
    >
      <button className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" onClick={() => { onOpen(); onClose(); }} type="button">
        <Info className="h-3.5 w-3.5" /> Open task
      </button>
      <button className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-300 cursor-default dark:text-gray-600" disabled type="button">
        <Copy className="h-3.5 w-3.5" /> Copy task link
      </button>
      <button className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" onClick={() => { onCreateBelow(); onClose(); }} type="button">
        <Plus className="h-3.5 w-3.5" /> Create new task below
      </button>

      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

      <button className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" onClick={() => { onAddSubitem(); onClose(); }} type="button">
        <PlusCircle className="h-3.5 w-3.5" /> Add subitem
      </button>

      {/* Move to Phase (project view) */}
      {phases && phases.length > 0 && onMoveToPhase && (
        <div className="relative">
          <button
            className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => { setShowPhaseSub(!showPhaseSub); setShowGroupSub(false); }}
            type="button"
          >
            <span className="flex items-center gap-2.5"><ArrowRight className="h-3.5 w-3.5" /> Move to Phase</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
          </button>
          {showPhaseSub && (
            <div className="absolute left-full top-0 z-50 ml-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
              {phases.map((p) => (
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  key={p.id}
                  onClick={() => { onMoveToPhase(p.id); onClose(); }}
                  type="button"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </button>
              ))}
              <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => { onMoveToPhase(''); onClose(); }}
                type="button"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                No Phase
              </button>
            </div>
          )}
        </div>
      )}

      {/* Move to Group (task view) */}
      {taskGroups && taskGroups.length > 0 && onMoveToGroup && (
        <div className="relative">
          <button
            className="flex w-full items-center justify-between px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => { setShowGroupSub(!showGroupSub); setShowPhaseSub(false); }}
            type="button"
          >
            <span className="flex items-center gap-2.5"><ArrowRight className="h-3.5 w-3.5" /> Move to Group</span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
          </button>
          {showGroupSub && (
            <div className="absolute left-full top-0 z-50 ml-1 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
              <button
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                onClick={() => { onMoveToGroup(''); onClose(); }}
                type="button"
              >
                None
              </button>
              {taskGroups.map((g) => (
                <button
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  key={g.id}
                  onClick={() => { onMoveToGroup(g.id); onClose(); }}
                  type="button"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

      <button className="flex w-full items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => { onDelete(); onClose(); }} type="button">
        <Trash2 className="h-3.5 w-3.5" /> Delete
      </button>
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
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks?parentTaskId=${parentTaskId}`);
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
      <div className="flex items-center border-b border-blue-100 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:border-blue-900/40">
        <div className="w-7 shrink-0 px-1"><input className="h-3 w-3 rounded border-gray-300" disabled type="checkbox" /></div>
        <div className="min-w-0 flex-1 px-2 py-1.5">Subitem</div>
        <div className="w-20 shrink-0 px-1 text-center">Owner</div>
        <div className="w-24 shrink-0 px-1 text-center">Status</div>
        <div className="w-24 shrink-0 px-1 text-center">Date</div>
        <div className="w-8 shrink-0" />
      </div>
      {subTasks.map((sub) => (
        <div className="flex items-center border-b border-blue-100/60 hover:bg-blue-100/40 dark:border-blue-900/30 dark:hover:bg-blue-900/20" key={sub.id}>
          <div className="w-7 shrink-0 px-1"><input className="h-3 w-3 rounded border-gray-300" type="checkbox" /></div>
          <div className="min-w-0 flex-1 px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200">{sub.title}</div>
          <div className="flex w-20 shrink-0 items-center justify-center px-1">
            {sub.assignee && (
              <div className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white', getAvatarColor(sub.assignee.name || sub.assignee.email))} title={sub.assignee.name ?? sub.assignee.email}>
                {initials(sub.assignee.name || sub.assignee.email)}
              </div>
            )}
          </div>
          <div className="flex w-24 shrink-0 items-center justify-center px-1">
            <span className={cn('w-full rounded py-0.5 text-center text-[11px] font-semibold', STATUS_CELL[sub.status] ?? STATUS_CELL.Todo)}>{sub.status}</span>
          </div>
          <div className="w-24 shrink-0 px-1 text-center text-xs text-gray-500">{sub.endDate ? format(new Date(sub.endDate), 'MMM d') : ''}</div>
          <div className="w-8 shrink-0" />
        </div>
      ))}
      {adding ? (
        <form className="flex items-center px-2 py-1" onSubmit={(e) => { e.preventDefault(); addSubItem(); }}>
          <div className="w-7 shrink-0" />
          <input autoFocus className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800" onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setNewTitle(''); } }} placeholder="Subitem name..." value={newTitle} />
          <button className="ml-1 rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600" type="submit">Add</button>
          <button className="ml-1 text-xs text-gray-400 hover:text-gray-600" onClick={() => { setAdding(false); setNewTitle(''); }} type="button">Cancel</button>
        </form>
      ) : (
        <button className="flex w-full items-center gap-1 px-4 py-1.5 text-xs text-gray-400 hover:text-blue-500" onClick={() => setAdding(true)} type="button">
          <Plus className="h-3 w-3" /> Add subitem
        </button>
      )}
    </div>
  );
}

// ── Bulk Actions Bar ────────────────────────────────────────

function BulkActionsBar({
  count,
  members,
  onClear,
  onDelete,
  onSetAssignee,
  onSetPriority,
  onSetStatus,
  onMoveToPhase,
  onMoveToGroup,
  phases,
  taskGroups,
}: {
  count: number;
  members: TaskUser[];
  onClear: () => void;
  onDelete: () => void;
  onSetStatus: (status: string) => void;
  onSetPriority: (priority: string) => void;
  onSetAssignee: (assigneeId: string | null) => void;
  onMoveToPhase?: (phaseId: string) => void;
  onMoveToGroup?: (groupId: string) => void;
  phases?: PhaseData[];
  taskGroups?: TaskGroupData[];
}) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 rounded-lg bg-indigo-600 px-4 py-2 text-white shadow-lg dark:bg-indigo-700">
      <span className="text-sm font-semibold">{count} selected</span>

      <div className="relative">
        <select className="rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white cursor-pointer hover:bg-indigo-400" onChange={(e) => { if (e.target.value) { onSetStatus(e.target.value); } e.target.value = ''; }} defaultValue="">
          <option value="" disabled>Set Status</option>
          <option value="Todo">Todo</option>
          <option value="In Progress">In Progress</option>
          <option value="Done">Done</option>
        </select>
      </div>

      <div className="relative">
        <select className="rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white cursor-pointer hover:bg-indigo-400" onChange={(e) => { if (e.target.value) { onSetPriority(e.target.value); } e.target.value = ''; }} defaultValue="">
          <option value="" disabled>Set Priority</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="NONE">None</option>
        </select>
      </div>

      <div className="relative">
        <select className="rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white cursor-pointer hover:bg-indigo-400" onChange={(e) => { onSetAssignee(e.target.value || null); e.target.value = ''; }} defaultValue="">
          <option value="" disabled>Set Person</option>
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
          ))}
        </select>
      </div>

      {phases && phases.length > 0 && onMoveToPhase && (
        <div className="relative">
          <select className="rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white cursor-pointer hover:bg-indigo-400" onChange={(e) => { onMoveToPhase(e.target.value); e.target.value = ''; }} defaultValue="">
            <option value="" disabled>Move to Phase</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            <option value="">No Phase</option>
          </select>
        </div>
      )}

      {taskGroups && taskGroups.length > 0 && onMoveToGroup && (
        <div className="relative">
          <select className="rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white cursor-pointer hover:bg-indigo-400" onChange={(e) => { onMoveToGroup(e.target.value); e.target.value = ''; }} defaultValue="">
            <option value="" disabled>Move to Group</option>
            <option value="">None</option>
            {taskGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      <button className="ml-auto rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-400" onClick={onDelete} type="button">
        <Trash2 className="inline h-3 w-3 mr-1" />Delete
      </button>
      <button className="rounded p-1 text-white/70 hover:text-white" onClick={onClear} type="button">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Main Table ───────────────────────────────────────────────

export function TaskTableView({
  currentUserRole,
  groupBy = 'status',
  initialOpenTaskId,
  members,
  phases = [],
  projectId,
  projects = [],
  slug,
  taskGroupId,
  taskGroups = [],
  tasks: initialTasks,
  workspaceId,
}: TaskTableViewProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskData[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialOpenTaskId ?? null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    taskId: string;
    groupKey: string;
    x: number;
    y: number;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // Column management
  const colStorageKey = `opchestra-cols-${projectId || taskGroupId || 'all'}`;
  const defaultVisibleCols = getDefaultVisibleColumns({ projectId, taskGroupId });
  const [colState, setColState] = useState(() => loadColumnState(colStorageKey, defaultVisibleCols));
  const visibleCols = colState.visible;
  const colWidths = colState.widths;

  function setVisibleCols(cols: string[]) {
    const next = { ...colState, visible: cols };
    setColState(next);
    saveColumnState(colStorageKey, cols, next.widths);
  }

  function setColWidth(key: string, width: number) {
    const next = { ...colState, widths: { ...colState.widths, [key]: width } };
    setColState(next);
    saveColumnState(colStorageKey, next.visible, next.widths);
  }

  function toggleColumn(key: string) {
    const cols = visibleCols.includes(key) ? visibleCols.filter(c => c !== key) : [...visibleCols, key];
    setVisibleCols(cols);
  }

  function getColWidth(key: string): number {
    if (colWidths[key]) { return colWidths[key]; }
    const def = COLUMN_DEFS.find(c => c.key === key);
    return def?.defaultWidth || 100;
  }

  function startResize(colKey: string, startX: number) {
    const startWidth = getColWidth(colKey);
    const minW = COLUMN_DEFS.find(c => c.key === colKey)?.minWidth || 60;
    function onMouseMove(e: MouseEvent) {
      const newWidth = Math.max(minW, startWidth + (e.clientX - startX));
      setColWidth(colKey, newWidth);
    }
    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  // Close column picker on click outside
  useEffect(() => {
    if (!showColumnPicker) { return; }
    function handler() { setShowColumnPicker(false); }
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showColumnPicker]);

  // Auto-scroll to and highlight the initial task
  useEffect(() => {
    if (initialOpenTaskId) {
      setTimeout(() => {
        const el = document.querySelector(`[data-task-id="${initialOpenTaskId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-blue-400');
          setTimeout(() => el.classList.remove('ring-2', 'ring-blue-400'), 2000);
        }
      }, 500);
    }
  }, [initialOpenTaskId]);

  const { colors: groupColors, groups: grouped } = groupTasksBy(tasks, groupBy, members);
  const allVisibleTaskIds = Object.values(grouped).flat().map((t) => t.id);
  const isProjectView = !!projectId;

  function toggleSelect(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === allVisibleTaskIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleTaskIds));
    }
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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

  async function createTask(groupKey: string) {
    if (!newTaskTitle.trim()) {
      return;
    }
    setSaving(true);
    const taskData: Record<string, unknown> = { title: newTaskTitle.trim(), projectId: projectId || undefined };
    if (groupBy === 'status') {
      taskData.status = groupKey;
    } else if (groupBy === 'group') {
      const tg = taskGroups.find((g) => g.name === groupKey);
      if (tg) {
        taskData.taskGroupId = tg.id;
      }
    } else if (groupBy === 'priority') {
      taskData.priority = groupKey;
    } else if (groupBy === 'project') {
      const proj = projects.find((p) => p.name === groupKey);
      if (proj) {
        taskData.projectId = proj.id;
      }
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/tasks`, {
        body: JSON.stringify(taskData),
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

  async function patchTask(taskId: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      return updated;
    }
    return null;
  }

  async function deleteTask(taskId: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setConfirmDelete(null);
    }
  }

  // Bulk actions
  async function bulkPatch(data: Record<string, unknown>) {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => patchTask(id, data)));
    if (taskGroupId && data.taskGroupId !== undefined && data.taskGroupId !== taskGroupId) {
      setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    }
    setSelectedIds(new Set());
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => fetch(`/api/workspaces/${workspaceId}/tasks/${id}`, { method: 'DELETE' })));
    setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
    setBulkConfirmDelete(false);
  }

  async function moveTaskToPhase(taskId: string, phaseId: string) {
    await patchTask(taskId, { phaseId: phaseId || null });
  }

  async function moveTaskToGroup(taskId: string, groupId: string) {
    const newGroupId = groupId || null;
    const res = await fetch(`/api/workspaces/${workspaceId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskGroupId: newGroupId }),
    });
    if (res.ok) {
      if (taskGroupId && newGroupId !== taskGroupId) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        const newGroup = newGroupId ? taskGroups.find((g) => g.id === newGroupId) : null;
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, taskGroup: newGroup ? { id: newGroup.id, name: newGroup.name, color: newGroup.color } : null }
              : t,
          ),
        );
      }
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          members={members}
          onClear={() => setSelectedIds(new Set())}
          onDelete={() => setBulkConfirmDelete(true)}
          onSetStatus={(s) => bulkPatch({ status: s })}
          onSetPriority={(p) => bulkPatch({ priority: p })}
          onSetAssignee={(a) => bulkPatch({ assigneeId: a })}
          onMoveToPhase={isProjectView && phases.length > 0 ? (id) => bulkPatch({ phaseId: id }) : undefined}
          onMoveToGroup={!isProjectView && taskGroups.length > 0 ? (id) => bulkPatch({ taskGroupId: id || null }) : undefined}
          phases={isProjectView ? phases : undefined}
          taskGroups={!isProjectView ? taskGroups : undefined}
        />
      )}

      <div className="min-w-[800px]">
        {Object.keys(grouped).map((groupKey) => {
          const groupTasks = grouped[groupKey] || [];
          const isCollapsed = collapsedGroups.has(groupKey);
          const color = groupColors[groupKey] || '#9CA3AF';

          return (
            <div className="mb-2" key={groupKey}>
              {/* Group Header */}
              <button
                className="flex w-full items-center gap-2 border-l-4 px-3 py-2"
                onClick={() => toggleGroup(groupKey)}
                style={{ borderLeftColor: color }}
                type="button"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                <span className="text-sm font-bold" style={{ color }}>{groupKey}</span>
                <span className="text-xs text-gray-400">({groupTasks.length})</span>
              </button>

              {!isCollapsed && (
                <>
                  {/* Column Headers */}
                  <div className="flex items-center border-b border-gray-200 bg-white text-[11px] font-medium tracking-wider text-gray-400 uppercase dark:border-gray-800 dark:bg-gray-950">
                    <div className="w-6 shrink-0" />
                    <div className="w-9 shrink-0" />
                    <div className="w-7 shrink-0 px-1">
                      <input
                        checked={allVisibleTaskIds.length > 0 && selectedIds.size === allVisibleTaskIds.length}
                        className="h-3 w-3 rounded border-gray-300 cursor-pointer"
                        onChange={toggleSelectAll}
                        type="checkbox"
                      />
                    </div>
                    {visibleCols.map((colKey) => {
                      const def = COLUMN_DEFS.find(c => c.key === colKey);
                      if (!def) { return null; }
                      const w = colKey === 'task' ? undefined : getColWidth(colKey);
                      return (
                        <div
                          className={cn(
                            'relative shrink-0 px-1 py-2',
                            colKey === 'task' ? 'min-w-0 flex-1 px-2' : 'text-center',
                            colKey === 'comments' && 'w-10',
                          )}
                          key={colKey}
                          style={w ? { width: w } : undefined}
                        >
                          {def.label}
                          {def.resizable && (
                            <div
                              className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400"
                              onMouseDown={(e) => { e.preventDefault(); startResize(colKey, e.clientX); }}
                            />
                          )}
                        </div>
                      );
                    })}
                    {/* Add column button */}
                    <div className="relative w-8 shrink-0 flex items-center justify-center">
                      <button
                        className="rounded p-0.5 text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-400"
                        onClick={() => setShowColumnPicker(!showColumnPicker)}
                        title="Add/remove columns"
                        type="button"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      {showColumnPicker && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                          {COLUMN_DEFS.filter(c => c.hideable).map((col) => (
                            <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800" key={col.key}>
                              <input
                                checked={visibleCols.includes(col.key)}
                                className="h-3 w-3 rounded border-gray-300"
                                onChange={() => toggleColumn(col.key)}
                                type="checkbox"
                              />
                              <span className="normal-case tracking-normal">{col.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task Rows */}
                  {groupTasks.map((task) => {
                    const isExpanded = expandedTasks.has(task.id);
                    const hasSubs = task._count.subTasks > 0;
                    const isSelected = selectedIds.has(task.id);

                    return (
                      <div data-task-id={task.id} key={task.id}>
                        <div
                          className={cn(
                            'group flex items-center border-b border-gray-100 transition-colors hover:bg-blue-50/50 dark:border-gray-800/50 dark:hover:bg-blue-950/20',
                            isSelected && 'bg-blue-100/60 dark:bg-blue-900/30',
                          )}
                        >
                          <div className="flex w-6 shrink-0 cursor-grab items-center justify-center">
                            <GripVertical className="h-3.5 w-3.5 text-gray-300 transition-colors hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400" />
                          </div>
                          <div className="flex w-9 shrink-0 items-center justify-center">
                            <button
                              className="rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-gray-500 group-hover:opacity-100 dark:text-gray-600 dark:hover:text-gray-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setContextMenu({ groupKey, taskId: task.id, x: rect.left, y: rect.bottom + 4 });
                              }}
                              type="button"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="w-7 shrink-0 px-1">
                            <input
                              checked={isSelected}
                              className="h-3.5 w-3.5 rounded border-gray-300 cursor-pointer dark:border-gray-600"
                              onChange={() => toggleSelect(task.id)}
                              type="checkbox"
                            />
                          </div>
                          <div className="min-w-0 flex-1 px-2 py-2">
                            <div className="flex items-center gap-1.5">
                              {hasSubs && (
                                <button className="shrink-0 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => toggleExpand(task.id)} type="button">
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                              )}
                              <span
                                className="min-w-0 truncate text-sm font-medium text-gray-900 outline-none focus:ring-1 focus:ring-blue-400 focus:rounded dark:text-white"
                                contentEditable
                                onBlur={(e) => {
                                  const newTitle = e.currentTarget.textContent?.trim();
                                  if (newTitle && newTitle !== task.title) {
                                    patchTask(task.id, { title: newTitle });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); }
                                  if (e.key === 'Escape') { e.currentTarget.textContent = task.title; (e.target as HTMLElement).blur(); }
                                }}
                                role="textbox"
                                suppressContentEditableWarning
                                tabIndex={0}
                              >
                                {task.title}
                              </span>
                              {task.isMilestone && <span className="shrink-0 text-xs text-purple-500">◆</span>}
                              <button className="shrink-0 rounded-full border border-gray-300 opacity-0 transition-opacity hover:border-blue-400 hover:text-blue-500 group-hover:opacity-100 dark:border-gray-600" onClick={() => setSelectedTaskId(task.id)} title="Open Task page" type="button">
                                <Info className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500" />
                              </button>
                              <button className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => setExpandedTasks((p) => new Set(p).add(task.id))} title="Add subitem" type="button">
                                <PlusCircle className="h-3.5 w-3.5 text-gray-400 hover:text-green-500" />
                              </button>
                            </div>
                          </div>
                          {/* Dynamic columns */}
                          {visibleCols.map((colKey) => {
                            const w = colKey === 'task' ? undefined : getColWidth(colKey);
                            const style = w ? { width: w } : undefined;

                            if (colKey === 'task') { return null; /* rendered above */ }

                            if (colKey === 'person') {
                              return (
                                <div className="flex shrink-0 items-center justify-center px-1" key={colKey} onClick={(e) => e.stopPropagation()} style={style}>
                                  <div className="relative">
                                    {task.assignee ? (
                                      <>
                                        <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white', getAvatarColor(task.assignee.name || task.assignee.email))} title={task.assignee.name ?? task.assignee.email}>
                                          {initials(task.assignee.name || task.assignee.email)}
                                        </div>
                                        <select className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => patchTask(task.id, { assigneeId: e.target.value || null })} value={task.assignee.id}>
                                          <option value="">Unassigned</option>
                                          {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
                                        </select>
                                      </>
                                    ) : (
                                      <div className="relative">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-400 dark:border-gray-600"><Plus className="h-3 w-3" /></div>
                                        <select className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => patchTask(task.id, { assigneeId: e.target.value || null })} value="">
                                          <option value="">Assign...</option>
                                          {members.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.email}</option>)}
                                        </select>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            if (colKey === 'status') {
                              return (
                                <div className="flex shrink-0 items-center justify-center px-0.5" key={colKey} onClick={(e) => e.stopPropagation()} style={style}>
                                  <div className="relative w-full">
                                    <div className={cn('w-full rounded py-1.5 text-center text-xs font-semibold', STATUS_CELL[task.status] ?? STATUS_CELL.Todo)}>{task.status}</div>
                                    <select className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => patchTask(task.id, { status: e.target.value })} value={task.status}>
                                      <option value="Todo">Todo</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Done">Done</option>
                                    </select>
                                  </div>
                                </div>
                              );
                            }

                            if (colKey === 'priority') {
                              return (
                                <div className="flex shrink-0 items-center justify-center px-0.5" key={colKey} style={style}>
                                  {task.priority !== 'NONE' ? (
                                    <span className={cn('w-full rounded py-1.5 text-center text-xs font-semibold', PRIORITY_CELL[task.priority])}>
                                      {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                                    </span>
                                  ) : (
                                    <span className="w-full py-1.5 text-center text-xs text-gray-300 dark:text-gray-600">—</span>
                                  )}
                                </div>
                              );
                            }

                            if (colKey === 'date') {
                              return (
                                <div className="shrink-0 px-1 text-center text-xs text-gray-500 dark:text-gray-400" key={colKey} style={style}>
                                  {task.endDate ? format(new Date(task.endDate), 'MMM d') : ''}
                                </div>
                              );
                            }

                            if (colKey === 'project') {
                              return (
                                <div className="flex shrink-0 items-center justify-center px-1" key={colKey} style={style}>
                                  {task.project && (
                                    <span className={cn('truncate rounded px-2 py-1 text-[11px] font-semibold', getProjectColor(task.project.name))}>{task.project.name}</span>
                                  )}
                                </div>
                              );
                            }

                            if (colKey === 'company') {
                              return (
                                <div className="flex shrink-0 items-center justify-center px-1" key={colKey} style={style}>
                                  {task.ticketCompany && (
                                    <a className="truncate rounded px-2 py-1 text-[11px] font-medium text-purple-600 hover:underline dark:text-purple-400" href={`/app/${slug}/contacts?company=${task.ticketCompany.id}`}>
                                      {task.ticketCompany.name}
                                    </a>
                                  )}
                                </div>
                              );
                            }

                            if (colKey === 'group') {
                              return (
                                <div className="flex shrink-0 items-center justify-center px-1" key={colKey} style={style}>
                                  <select
                                    className="w-full truncate rounded border-0 bg-transparent py-0.5 text-[11px] text-gray-600 cursor-pointer dark:text-gray-400"
                                    onChange={(e) => moveTaskToGroup(task.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    value={task.taskGroup?.id ?? ''}
                                  >
                                    <option value="">—</option>
                                    {taskGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                  </select>
                                </div>
                              );
                            }

                            if (colKey === 'phase') {
                              return (
                                <div className="flex shrink-0 items-center justify-center px-1 text-[11px] text-gray-500 dark:text-gray-400" key={colKey} style={style}>
                                  {(task as unknown as { phase?: { name: string; color: string } }).phase?.name ?? '—'}
                                </div>
                              );
                            }

                            if (colKey === 'comments') {
                              return (
                                <div className="flex w-10 shrink-0 items-center justify-center" key={colKey}>
                                  {task._count.comments > 0 && (
                                    <div className="flex items-center gap-0.5 text-gray-400">
                                      <MessageSquare className="h-3 w-3" />
                                      <span className="text-[10px]">{task._count.comments}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return null;
                          })}
                          <div className="w-8 shrink-0" />
                        </div>
                        {isExpanded && <SubItemsSection members={members} parentTaskId={task.id} workspaceId={workspaceId} />}
                      </div>
                    );
                  })}

                  {/* Add Item Row */}
                  <div className="border-b border-gray-100 dark:border-gray-800/50">
                    {addingInGroup === groupKey ? (
                      <form className="flex items-center py-1 pl-[96px] pr-4" onSubmit={(e) => { e.preventDefault(); createTask(groupKey); }}>
                        <input autoFocus className="min-w-0 flex-1 bg-transparent py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white" disabled={saving} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setAddingInGroup(null); setNewTaskTitle(''); } }} placeholder="Task name..." value={newTaskTitle} />
                        {newTaskTitle.trim() && <button className="ml-2 rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600" disabled={saving} type="submit">Add</button>}
                        <button className="ml-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-gray-600" onClick={() => { setAddingInGroup(null); setNewTaskTitle(''); }} type="button">✕</button>
                      </form>
                    ) : (
                      <button className="flex w-full items-center gap-1.5 py-2 pl-[96px] text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => { setAddingInGroup(groupKey); setNewTaskTitle(''); }} type="button">
                        <Plus className="h-3.5 w-3.5" /> Add item
                      </button>
                    )}
                  </div>

                  {/* Group Summary */}
                  {groupTasks.length > 0 && (
                    <div className="flex items-center border-b border-gray-200/60 bg-gray-50/50 text-[10px] text-gray-400 dark:border-gray-800/40 dark:bg-gray-900/20">
                      <div className="w-6 shrink-0" /><div className="w-9 shrink-0" /><div className="w-7 shrink-0" />
                      {visibleCols.map((colKey) => {
                        if (colKey === 'task') { return <div className="min-w-0 flex-1" key={colKey} />; }
                        if (colKey === 'status') {
                          const w = getColWidth(colKey);
                          return (
                            <div className="flex shrink-0 items-center justify-center px-1" key={colKey} style={{ width: w }}>
                              <div className="flex h-1.5 w-full overflow-hidden rounded-full">
                                {(() => {
                                  const d = groupTasks.filter((t) => t.status === 'Done').length;
                                  const p = groupTasks.filter((t) => t.status === 'In Progress').length;
                                  const o = groupTasks.length - d - p;
                                  const n = groupTasks.length;
                                  return (<>{d > 0 && <div className="bg-green-500" style={{ width: `${(d / n) * 100}%` }} />}{p > 0 && <div className="bg-amber-400" style={{ width: `${(p / n) * 100}%` }} />}{o > 0 && <div className="bg-gray-300 dark:bg-gray-600" style={{ width: `${(o / n) * 100}%` }} />}</>);
                                })()}
                              </div>
                            </div>
                          );
                        }
                        if (colKey === 'comments') {
                          return <div className="w-10 shrink-0 py-1.5 text-center" key={colKey}>{groupTasks.length} {groupTasks.length === 1 ? 'item' : 'items'}</div>;
                        }
                        const w = getColWidth(colKey);
                        return <div className="shrink-0" key={colKey} style={{ width: w }} />;
                      })}
                      <div className="w-8 shrink-0" />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="px-8 py-16 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks yet</p>
            <button className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400" onClick={() => setAddingInGroup('Todo')} type="button">Create your first task</button>
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          onAddSubitem={() => setExpandedTasks((p) => new Set(p).add(contextMenu.taskId))}
          onClose={() => setContextMenu(null)}
          onCreateBelow={() => { setAddingInGroup(contextMenu.groupKey); setNewTaskTitle(''); }}
          onDelete={() => setConfirmDelete(contextMenu.taskId)}
          onOpen={() => setSelectedTaskId(contextMenu.taskId)}
          onMoveToPhase={isProjectView && phases.length > 0 ? (phaseId) => moveTaskToPhase(contextMenu.taskId, phaseId) : undefined}
          onMoveToGroup={!isProjectView && taskGroups.length > 0 ? (groupId) => moveTaskToGroup(contextMenu.taskId, groupId) : undefined}
          phases={isProjectView ? phases : undefined}
          taskGroups={!isProjectView ? taskGroups : undefined}
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
              <button className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" onClick={() => setConfirmDelete(null)} type="button">Cancel</button>
              <button className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700" onClick={() => deleteTask(confirmDelete)} type="button">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation */}
      {bulkConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Delete {selectedIds.size} tasks?</p>
            <p className="mt-1 text-xs text-gray-500">This action cannot be undone.</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" onClick={() => setBulkConfirmDelete(false)} type="button">Cancel</button>
              <button className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700" onClick={bulkDelete} type="button">Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Task detail panel */}
      {selectedTaskId && (
        <TaskDetailPanel
          currentUserRole={currentUserRole}
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
