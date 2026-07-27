'use client';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Contact,
  CreditCard,
  Eye,
  FolderKanban,
  Home,
  Layers,
  LayoutList,
  Menu,
  Plus,
  Receipt,
  Search,
  Settings,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface PhaseData {
  id: string;
  name: string;
  color: string;
}

interface TaskGroupData {
  id: string;
  name: string;
  color: string;
}

interface ProjectData {
  id: string;
  name: string;
  phases?: PhaseData[];
}

interface SidebarProps {
  slug: string;
  workspaceName: string;
  workspaceId: string;
  projects: ProjectData[];
  taskGroups?: TaskGroupData[];
  views?: Array<{ id: string; name: string }>;
}

export function Sidebar({ projects, slug, taskGroups = [], views = [], workspaceId, workspaceName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [newPhaseProjectId, setNewPhaseProjectId] = useState<string | null>(null);
  const [newPhaseName, setNewPhaseName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);

  const base = `/app/${slug}`;

  const navItems = [
    { href: base, icon: Home, label: 'Home' },
    { href: `${base}/my-tasks`, icon: LayoutList, label: 'My Tasks' },
    { href: `${base}/tickets`, icon: Ticket, label: 'Tickets' },
    { href: `${base}/contacts`, icon: Contact, label: 'Contacts' },
  ];

  const bottomItems = [
    { href: `${base}/time-tracking`, icon: Clock, label: 'Time Tracking' },
    { href: `${base}/invoicing`, icon: Receipt, label: 'Invoicing' },
    { href: `${base}/billing`, icon: CreditCard, label: 'Billing' },
    { href: `${base}/settings`, icon: Settings, label: 'Settings' },
  ];

  function isActive(href: string) {
    if (href === base) {
      return pathname === base;
    }
    return pathname.startsWith(href);
  }

  function toggleProject(projectId: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  async function createPhase(projectId: string) {
    if (!newPhaseName.trim()) {
      return;
    }
    try {
      await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPhaseName.trim() }),
      });
      setNewPhaseName('');
      setNewPhaseProjectId(null);
      router.refresh();
    } catch {
      // ignore
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) {
      return;
    }
    try {
      await fetch(`/api/workspaces/${workspaceId}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      setNewGroupName('');
      setShowNewGroup(false);
      router.refresh();
    } catch {
      // ignore
    }
  }

  return (
    <>
      <button
        className="fixed top-3 left-3 z-50 rounded-lg border border-gray-200 bg-white p-2 shadow-sm lg:hidden dark:border-gray-700 dark:bg-gray-900"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white transition-all dark:border-gray-800 dark:bg-gray-950',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          {!collapsed && (
            <Link className="text-sm font-semibold text-gray-900 dark:text-white" href={base}>
              {workspaceName}
            </Link>
          )}
          <button
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-1 px-2">
            <Link
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              href={`${base}/search`}
            >
              <Search className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Search</span>}
            </Link>
          </div>

          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <Link
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive(item.href)
                    ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                )}
                href={item.href}
                key={item.href}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Projects with Phases */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 py-1">
              {!collapsed && (
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                  Projects
                </span>
              )}
              <Link
                className="rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                href={`${base}/projects/new`}
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>
            <nav className="mt-1 space-y-0.5">
              {projects.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                const projectActive = isActive(`${base}/projects/${project.id}`);
                const phases = project.phases ?? [];

                return (
                  <div key={project.id}>
                    <div className="flex items-center">
                      {!collapsed && (
                        <button
                          className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          onClick={() => toggleProject(project.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                      )}
                      <Link
                        className={cn(
                          'flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                          projectActive
                            ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                        )}
                        href={`${base}/projects/${project.id}`}
                      >
                        <FolderKanban className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="truncate">{project.name}</span>}
                      </Link>
                    </div>

                    {isExpanded && !collapsed && (
                      <div className="ml-5 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2 dark:border-gray-800">
                        <Link
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors',
                            pathname === `${base}/projects/${project.id}`
                              ? 'font-medium text-blue-700 dark:text-blue-300'
                              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                          )}
                          href={`${base}/projects/${project.id}`}
                        >
                          <LayoutList className="h-3 w-3 shrink-0" />
                          All Tasks
                        </Link>

                        {phases.map((phase) => (
                          <Link
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors',
                              isActive(`${base}/projects/${project.id}/phases/${phase.id}`)
                                ? 'font-medium text-blue-700 dark:text-blue-300'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                            )}
                            href={`${base}/projects/${project.id}/phases/${phase.id}`}
                            key={phase.id}
                          >
                            <Circle
                              className="h-2.5 w-2.5 shrink-0"
                              fill={phase.color}
                              stroke={phase.color}
                            />
                            <span className="truncate">{phase.name}</span>
                          </Link>
                        ))}

                        {newPhaseProjectId === project.id ? (
                          <form
                            className="flex items-center gap-1 px-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              createPhase(project.id);
                            }}
                          >
                            <input
                              autoFocus
                              className="w-full rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                              onBlur={() => {
                                if (!newPhaseName.trim()) {
                                  setNewPhaseProjectId(null);
                                }
                              }}
                              onChange={(e) => setNewPhaseName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setNewPhaseProjectId(null);
                                  setNewPhaseName('');
                                }
                              }}
                              placeholder="Phase name"
                              value={newPhaseName}
                            />
                          </form>
                        ) : (
                          <button
                            className="flex items-center gap-2 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            onClick={() => setNewPhaseProjectId(project.id)}
                          >
                            <Plus className="h-3 w-3" />
                            New Phase
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {projects.length === 0 && !collapsed && (
                <p className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
                  No projects yet
                </p>
              )}
            </nav>
          </div>

          {/* Task Groups (cross-project) */}
          {!collapsed && (
            <div className="mt-6">
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                  Groups
                </span>
                <button
                  className="rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  onClick={() => setShowNewGroup(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <nav className="mt-1 space-y-0.5">
                {taskGroups.map((group) => (
                  <Link
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      isActive(`${base}/groups/${group.id}`)
                        ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                    )}
                    href={`${base}/groups/${group.id}`}
                    key={group.id}
                  >
                    <Layers className="h-4 w-4 shrink-0" style={{ color: group.color }} />
                    <span className="truncate">{group.name}</span>
                  </Link>
                ))}
                {taskGroups.length === 0 && !showNewGroup && (
                  <p className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
                    No groups yet
                  </p>
                )}
                {showNewGroup && (
                  <form
                    className="flex items-center gap-1 px-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      createGroup();
                    }}
                  >
                    <input
                      autoFocus
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      onBlur={() => {
                        if (!newGroupName.trim()) {
                          setShowNewGroup(false);
                        }
                      }}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setShowNewGroup(false);
                          setNewGroupName('');
                        }
                      }}
                      placeholder="Group name"
                      value={newGroupName}
                    />
                  </form>
                )}
              </nav>
            </div>
          )}

          {views.length > 0 && (
            <div className="mt-6">
              <div className="px-3 py-1">
                {!collapsed && (
                  <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                    Views
                  </span>
                )}
              </div>
              <nav className="mt-1 space-y-0.5">
                {views.map((view) => (
                  <Link
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    href={`${base}/views/${view.id}`}
                    key={view.id}
                  >
                    <Eye className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{view.name}</span>}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-2 py-3 dark:border-gray-800">
          <nav className="space-y-0.5">
            {bottomItems.map((item) => (
              <Link
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive(item.href)
                    ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                )}
                href={item.href}
                key={item.href}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
