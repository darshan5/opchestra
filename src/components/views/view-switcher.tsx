'use client';

import {
  Calendar,
  Columns3,
  Filter,
  GanttChartSquare,
  Plus,
  Table2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { CalendarView } from '@/components/tasks/calendar-view';
import { GanttView } from '@/components/tasks/gantt-view';
import { KanbanView } from '@/components/tasks/kanban-view';
import { TaskTableView } from '@/components/tasks/task-table-view';
import { cn } from '@/lib/utils';

type Layout = 'TABLE' | 'KANBAN' | 'CALENDAR' | 'GANTT';

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
  taskGroup?: TaskGroupData | null;
  startDate?: string | Date | null;
  endDate: string | Date | null;
  isMilestone: boolean;
  taskLabels: Array<{ label: { id: string; name: string; color: string } }>;
  _count: { subTasks: number; comments: number };
}

interface SavedView {
  id: string;
  name: string;
  layout: Layout;
  config: Record<string, unknown>;
  isShared: boolean;
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

type GroupByOption = 'group' | 'status' | 'priority' | 'person' | 'project' | 'phase';

interface ViewSwitcherProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  taskGroupId?: string;
  slug: string;
  members: TaskUser[];
  projects?: Array<{ id: string; name: string }>;
  taskGroups?: TaskGroupData[];
  phases?: PhaseData[];
  defaultGroupBy?: GroupByOption;
  context?: 'all-tasks' | 'my-tasks' | 'project' | 'group';
  currentUserRole?: string;
  initialOpenTaskId?: string;
}

interface FilterRow {
  field: string;
  operator: string;
  value: string;
}

const layoutItems: Array<{ value: Layout; icon: typeof Table2; label: string }> = [
  { icon: Table2, label: 'Table', value: 'TABLE' },
  { icon: Columns3, label: 'Kanban', value: 'KANBAN' },
  { icon: Calendar, label: 'Calendar', value: 'CALENDAR' },
  { icon: GanttChartSquare, label: 'Gantt', value: 'GANTT' },
];

const FILTER_FIELDS_ALL = [
  { label: 'Status', value: 'status' },
  { label: 'Priority', value: 'priority' },
  { label: 'Person', value: 'assignee' },
  { label: 'Project', value: 'project' },
];

const FILTER_FIELDS_PROJECT = [
  { label: 'Status', value: 'status' },
  { label: 'Priority', value: 'priority' },
  { label: 'Person', value: 'assignee' },
];

const FILTER_OPS = [
  { label: 'is', value: 'is' },
  { label: 'is not', value: 'isNot' },
];

const STATUS_OPTIONS = [
  { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Todo', value: 'Todo' },
  { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: 'In Progress', value: 'In Progress' },
  { color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: 'Done', value: 'Done' },
];

const PRIORITY_OPTIONS = [
  { color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', label: 'None', value: 'NONE' },
  { color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: 'Low', value: 'LOW' },
  { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', label: 'Medium', value: 'MEDIUM' },
  { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', label: 'High', value: 'HIGH' },
  { color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: 'Urgent', value: 'URGENT' },
];

const GROUP_BY_OPTIONS: Array<{ label: string; value: GroupByOption }> = [
  { label: 'Group', value: 'group' },
  { label: 'Status', value: 'status' },
  { label: 'Priority', value: 'priority' },
  { label: 'Person', value: 'person' },
  { label: 'Project', value: 'project' },
];

export function ViewSwitcher({
  context = 'all-tasks',
  currentUserRole,
  defaultGroupBy = 'status',
  initialOpenTaskId,
  members,
  phases = [],
  projectId,
  projects = [],
  slug,
  taskGroupId,
  taskGroups = [],
  tasks,
  workspaceId,
}: ViewSwitcherProps) {
  const isProjectView = context === 'project';
  const filterFields = isProjectView ? FILTER_FIELDS_PROJECT : FILTER_FIELDS_ALL;

  const [layout, setLayout] = useState<Layout>('TABLE');
  const [groupBy, setGroupBy] = useState<GroupByOption>(isProjectView ? 'phase' : defaultGroupBy);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [showNewView, setShowNewView] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchViews = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/views`);
      if (res.ok) {
        const data = await res.json();
        setSavedViews(data);
      }
    } catch {
      // ignore
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchViews();
  }, [fetchViews]);

  function applyFilters(data: TaskData[]): TaskData[] {
    let result = data;
    for (const f of filters) {
      if (!f.value) {
        continue;
      }
      result = result.filter((task) => {
        let val = '';
        if (f.field === 'status') {
          val = task.status;
        }
        if (f.field === 'priority') {
          val = task.priority;
        }
        if (f.field === 'assignee') {
          val = task.assignee?.name ?? task.assignee?.email ?? '';
        }
        if (f.field === 'project') {
          val = task.project?.name ?? '';
        }

        if (f.operator === 'is') {
          return val.toLowerCase() === f.value.toLowerCase();
        }
        if (f.operator === 'isNot') {
          return val.toLowerCase() !== f.value.toLowerCase();
        }
        return true;
      });
    }
    return result;
  }

  function addFilter() {
    setFilters([...filters, { field: 'status', operator: 'is', value: '' }]);
    setShowFilters(true);
  }

  function removeFilter(idx: number) {
    setFilters(filters.filter((_, i) => i !== idx));
  }

  function updateFilter(idx: number, patch: Partial<FilterRow>) {
    if (patch.field) {
      patch.value = '';
    }
    setFilters(filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  async function saveView() {
    if (!newViewName.trim()) {
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newViewName.trim(),
          layout,
          config: { filters, groupBy },
          isShared: false,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setNewViewName('');
        setShowNewView(false);
        setActiveViewId(created.id);
        fetchViews();
      }
    } catch {
      // ignore
    }
  }

  function loadView(view: SavedView) {
    setLayout(view.layout);
    const config = view.config as { filters?: FilterRow[]; groupBy?: GroupByOption };
    if (config.filters) {
      setFilters(config.filters);
      if (config.filters.length > 0) {
        setShowFilters(true);
      }
    } else {
      setFilters([]);
    }
    if (config.groupBy) {
      setGroupBy(config.groupBy);
    }
    setActiveViewId(view.id);
  }

  async function deleteView(viewId: string) {
    await fetch(`/api/workspaces/${workspaceId}/views/${viewId}`, { method: 'DELETE' });
    if (activeViewId === viewId) {
      setActiveViewId(null);
    }
    setDeleteConfirm(null);
    fetchViews();
  }

  function renderFilterValueInput(f: FilterRow, idx: number) {
    if (f.field === 'status') {
      return (
        <select
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          onChange={(e) => updateFilter(idx, { value: e.target.value })}
          value={f.value}
        >
          <option value="">Select...</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (f.field === 'priority') {
      return (
        <select
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          onChange={(e) => updateFilter(idx, { value: e.target.value })}
          value={f.value}
        >
          <option value="">Select...</option>
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (f.field === 'assignee') {
      return (
        <select
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          onChange={(e) => updateFilter(idx, { value: e.target.value })}
          value={f.value}
        >
          <option value="">Select...</option>
          {members.map((m) => (
            <option key={m.id} value={m.name ?? m.email}>
              {m.name ?? m.email}
            </option>
          ))}
        </select>
      );
    }

    if (f.field === 'project') {
      return (
        <select
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          onChange={(e) => updateFilter(idx, { value: e.target.value })}
          value={f.value}
        >
          <option value="">Select...</option>
          {projects.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        onChange={(e) => updateFilter(idx, { value: e.target.value })}
        placeholder="Value..."
        value={f.value}
      />
    );
  }

  const filteredTasks = applyFilters(tasks);

  return (
    <div className="flex h-full flex-col">
      {/* Row 1: Layout switcher + Filter button */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="flex items-center gap-1">
          {layoutItems.map((l) => (
            <button
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                layout === l.value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
              )}
              key={l.value}
              onClick={() => {
                setLayout(l.value);
                setActiveViewId(null);
              }}
            >
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {layout === 'TABLE' && !isProjectView && (
            <div className="flex items-center gap-1 border-l border-gray-300 pl-3 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400">Organize:</span>
              {GROUP_BY_OPTIONS.map((opt) => (
                <button
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    groupBy === opt.value
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                  )}
                  key={opt.value}
                  onClick={() => { setGroupBy(opt.value as GroupByOption); setActiveViewId(null); }}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
              {phases.length > 0 && (
                <button
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    groupBy === 'phase'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                  )}
                  onClick={() => { setGroupBy('phase' as GroupByOption); setActiveViewId(null); }}
                  type="button"
                >
                  Phase
                </button>
              )}
            </div>
          )}
          <button
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
              filters.length > 0
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
            {filters.length > 0 && (
              <span className="rounded-full bg-blue-600 px-1 text-[10px] text-white">
                {filters.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Row 2: Saved views as tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 px-4 py-1.5 dark:border-gray-800">
        {savedViews.map((v) => (
          <div className="group relative flex items-center" key={v.id}>
            {deleteConfirm === v.id ? (
              <div className="flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2 py-1 dark:border-red-800 dark:bg-red-900/30">
                <span className="text-xs text-red-700 dark:text-red-300">Delete?</span>
                <button
                  className="rounded px-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900"
                  onClick={() => deleteView(v.id)}
                >
                  Yes
                </button>
                <button
                  className="rounded px-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  onClick={() => setDeleteConfirm(null)}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                className={cn(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  activeViewId === v.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
                )}
                onClick={() => loadView(v)}
              >
                {v.name}
                <span
                  className="ml-0.5 hidden rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-500 group-hover:inline-flex dark:hover:bg-gray-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(v.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <X className="h-2.5 w-2.5" />
                </span>
              </button>
            )}
          </div>
        ))}

        {showNewView ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="w-28 rounded border border-gray-300 bg-white px-2 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveView();
                }
                if (e.key === 'Escape') {
                  setShowNewView(false);
                  setNewViewName('');
                }
              }}
              placeholder="View name..."
              value={newViewName}
            />
            <button
              className="rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
              onClick={saveView}
            >
              Save
            </button>
            <button
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => {
                setShowNewView(false);
                setNewViewName('');
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            className="flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            onClick={() => setShowNewView(true)}
            title="Save current view"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          {filters.map((f, idx) => (
            <div className="mb-1 flex items-center gap-2" key={idx}>
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                onChange={(e) => updateFilter(idx, { field: e.target.value })}
                value={f.field}
              >
                {filterFields.map((ff) => (
                  <option key={ff.value} value={ff.value}>
                    {ff.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                onChange={(e) => updateFilter(idx, { operator: e.target.value })}
                value={f.operator}
              >
                {FILTER_OPS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {renderFilterValueInput(f, idx)}
              <button className="text-gray-400 hover:text-red-500" onClick={() => removeFilter(idx)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            className="mt-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            onClick={addFilter}
          >
            + Add filter
          </button>
        </div>
      )}

      {/* View content */}
      <div className="flex-1 overflow-auto">
        {layout === 'TABLE' && (
          <TaskTableView
            currentUserRole={currentUserRole}
            groupBy={groupBy}
            initialOpenTaskId={initialOpenTaskId}
            members={members}
            phases={phases}
            projectId={projectId}
            projects={projects}
            slug={slug}
            taskGroupId={taskGroupId}
            taskGroups={taskGroups}
            tasks={filteredTasks}
            workspaceId={workspaceId}
          />
        )}
        {layout === 'KANBAN' && (
          <KanbanView
            members={members}
            projectId={projectId}
            projects={projects}
            slug={slug}
            tasks={filteredTasks}
            workspaceId={workspaceId}
          />
        )}
        {layout === 'CALENDAR' && (
          <CalendarView
            members={members}
            projectId={projectId}
            projects={projects}
            slug={slug}
            tasks={filteredTasks}
            workspaceId={workspaceId}
          />
        )}
        {layout === 'GANTT' && (
          <GanttView
            members={members}
            projectId={projectId}
            projects={projects}
            slug={slug}
            tasks={filteredTasks}
            workspaceId={workspaceId}
          />
        )}
      </div>
    </div>
  );
}
