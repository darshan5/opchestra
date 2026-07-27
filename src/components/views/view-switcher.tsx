'use client';

import {
  Calendar,
  Columns3,
  Filter,
  List,
  Save,
  Table2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { CalendarView } from '@/components/tasks/calendar-view';
import { KanbanView } from '@/components/tasks/kanban-view';
import { TaskTableView } from '@/components/tasks/task-table-view';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Layout = 'TABLE' | 'KANBAN' | 'CALENDAR';

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

interface SavedView {
  id: string;
  name: string;
  layout: Layout;
  config: Record<string, unknown>;
  isShared: boolean;
}

interface ViewSwitcherProps {
  tasks: TaskData[];
  workspaceId: string;
  projectId?: string;
  slug: string;
  members: TaskUser[];
  projects?: Array<{ id: string; name: string }>;
}

interface FilterRow {
  field: string;
  operator: string;
  value: string;
}

const layouts: Array<{ value: Layout; icon: typeof Table2; label: string }> = [
  { icon: Table2, label: 'Table', value: 'TABLE' },
  { icon: Columns3, label: 'Kanban', value: 'KANBAN' },
  { icon: Calendar, label: 'Calendar', value: 'CALENDAR' },
];

const FILTER_FIELDS = [
  { label: 'Status', value: 'status' },
  { label: 'Priority', value: 'priority' },
  { label: 'Assignee', value: 'assignee' },
];

const FILTER_OPS = [
  { label: 'is', value: 'is' },
  { label: 'is not', value: 'isNot' },
];

export function ViewSwitcher({
  members,
  projectId,
  projects = [],
  slug,
  tasks,
  workspaceId,
}: ViewSwitcherProps) {
  const [layout, setLayout] = useState<Layout>('TABLE');
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

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
  }

  function removeFilter(idx: number) {
    setFilters(filters.filter((_, i) => i !== idx));
  }

  function updateFilter(idx: number, patch: Partial<FilterRow>) {
    setFilters(filters.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  async function saveView() {
    if (!saveName.trim()) {
      return;
    }
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(),
          layout,
          config: { filters },
          isShared: false,
        }),
      });
      if (res.ok) {
        setSaveName('');
        setShowSaveDialog(false);
        fetchViews();
      }
    } catch {
      // ignore
    }
  }

  function loadView(view: SavedView) {
    setLayout(view.layout);
    const config = view.config as { filters?: FilterRow[] };
    if (config.filters) {
      setFilters(config.filters);
    }
    setShowViewMenu(false);
  }

  async function deleteView(viewId: string) {
    await fetch(`/api/workspaces/${workspaceId}/views/${viewId}`, { method: 'DELETE' });
    fetchViews();
  }

  const filteredTasks = applyFilters(tasks);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-800">
        <div className="flex items-center gap-1">
          {layouts.map((l) => (
            <button
              className={cn(
                'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                layout === l.value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800',
              )}
              key={l.value}
              onClick={() => setLayout(l.value)}
            >
              <l.icon className="h-3.5 w-3.5" />
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
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

          <div className="relative">
            <button
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setShowViewMenu(!showViewMenu)}
            >
              <List className="h-3.5 w-3.5" />
              Views
            </button>
            {showViewMenu && (
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {savedViews.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-400">No saved views</p>
                )}
                {savedViews.map((v) => (
                  <div
                    className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
                    key={v.id}
                  >
                    <button
                      className="flex-1 text-left text-xs text-gray-700 dark:text-gray-300"
                      onClick={() => loadView(v)}
                    >
                      {v.name}
                    </button>
                    <button
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => deleteView(v.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="border-t border-gray-100 px-3 py-1.5 dark:border-gray-700">
                  <button
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    onClick={() => {
                      setShowSaveDialog(true);
                      setShowViewMenu(false);
                    }}
                  >
                    <Save className="h-3 w-3" />
                    Save current view
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          {filters.map((f, idx) => (
            <div className="mb-1 flex items-center gap-2" key={idx}>
              <select
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                onChange={(e) => updateFilter(idx, { field: e.target.value })}
                value={f.field}
              >
                {FILTER_FIELDS.map((ff) => (
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
              <input
                className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                placeholder="Value..."
                value={f.value}
              />
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

      {showSaveDialog && (
        <div className="border-b border-gray-200 bg-blue-50 px-4 py-2 dark:border-gray-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="View name..."
              value={saveName}
            />
            <Button onClick={saveView} size="sm">
              Save
            </Button>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setShowSaveDialog(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {layout === 'TABLE' && (
          <TaskTableView
            members={members}
            projectId={projectId}
            projects={projects}
            slug={slug}
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
      </div>
    </div>
  );
}
