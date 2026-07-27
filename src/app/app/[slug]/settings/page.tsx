'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ConfigurableItemList } from '@/components/settings/configurable-item-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Tab = 'general' | 'task-views' | 'members' | 'sla';

interface Member {
  id: string;
  role: string;
  user: { id: string; email: string; name: string | null; image: string | null };
}

interface StatusItem {
  name: string;
  color: string;
  category: string;
}

interface GroupItem {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  status: string;
  position: number;
}

interface FieldDef {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  position: number;
}

interface SlaRow {
  priority: string;
  responseTime: number;
  resolutionTime: number;
}

const FIELD_TYPES = [
  { label: 'Text', value: 'text' }, { label: 'Long Text', value: 'long_text' },
  { label: 'Number', value: 'number' }, { label: 'Checkbox', value: 'checkbox' },
  { label: 'Dropdown', value: 'dropdown' }, { label: 'Multi-select', value: 'multi_select' },
  { label: 'Date', value: 'date' }, { label: 'Hour', value: 'hour' },
  { label: 'Person', value: 'person' }, { label: 'URL', value: 'url' },
  { label: 'Email', value: 'email' }, { label: 'Phone', value: 'phone' },
  { label: 'Files', value: 'files' }, { label: 'Rating', value: 'rating' },
  { label: 'Currency', value: 'currency' }, { label: 'Formula', value: 'formula' },
  { label: 'Location', value: 'location' }, { label: 'Color', value: 'color' },
];

const SLA_DEFAULTS: SlaRow[] = [
  { priority: 'URGENT', responseTime: 30, resolutionTime: 240 },
  { priority: 'HIGH', responseTime: 60, resolutionTime: 480 },
  { priority: 'MEDIUM', responseTime: 240, resolutionTime: 1440 },
  { priority: 'LOW', responseTime: 480, resolutionTime: 2880 },
];

const STATUS_CATEGORIES = [
  { label: 'To Do', value: 'todo' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Done', value: 'done' },
];

const PRIORITY_DEFAULTS = [
  { color: '#EF4444', key: 'URGENT', label: 'Urgent' },
  { color: '#F97316', key: 'HIGH', label: 'High' },
  { color: '#EAB308', key: 'MEDIUM', label: 'Medium' },
  { color: '#3B82F6', key: 'LOW', label: 'Low' },
  { color: '#9CA3AF', key: 'NONE', label: 'None' },
];

export default function WorkspaceSettingsPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('general');
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // General
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  // Task Views
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [priorities, setPriorities] = useState(PRIORITY_DEFAULTS);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [showCreateField, setShowCreateField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Members
  const [members, setMembers] = useState<Member[]>([]);
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState<string | null>(null);
  const [deleteFieldConfirm, setDeleteFieldConfirm] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);

  // SLA
  const [slaRules, setSlaRules] = useState<SlaRow[]>(SLA_DEFAULTS);
  const [savingSla, setSavingSla] = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((workspaces) => {
        const ws = workspaces.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
        }
        setLoading(false);
      });
  }, [params.slug]);

  const fetchAll = useCallback(async () => {
    if (!workspaceId) {
      return;
    }

    const [membersRes, workflowRes, groupsRes, projectsRes, fieldsRes, slaRes] = await Promise.all([
      fetch(`/api/workspaces/${workspaceId}/members`),
      fetch(`/api/workspaces/${workspaceId}/workflows/default`),
      fetch(`/api/workspaces/${workspaceId}/groups`),
      fetch(`/api/workspaces/${workspaceId}/projects`),
      fetch(`/api/workspaces/${workspaceId}/custom-fields`),
      fetch(`/api/workspaces/${workspaceId}/sla-rules`),
    ]);

    if (membersRes.ok) {
      setMembers(await membersRes.json());
    }
    if (workflowRes.ok) {
      const data = await workflowRes.json();
      setStatuses(data.statuses || []);
    }
    if (groupsRes.ok) {
      setGroups(await groupsRes.json());
    }
    if (projectsRes.ok) {
      setProjects(await projectsRes.json());
    }
    if (fieldsRes.ok) {
      setFields(await fieldsRes.json());
    }
    if (slaRes.ok) {
      const data = await slaRes.json();
      if (data.length > 0) {
        setSlaRules(data);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      fetchAll();
    }
  }, [workspaceId, fetchAll]);

  function showMsg(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  }

  // ── Status handlers ──
  async function saveStatuses(items: StatusItem[]) {
    if (!workspaceId) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/workflows/default`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statuses: items }),
    });
  }

  // ── Group handlers ──
  async function addGroup(name: string, color: string) {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    if (res.ok) {
      const created = await res.json();
      setGroups([...groups, { ...created, position: groups.length }]);
    }
  }

  async function updateGroup(id: string, data: { name?: string; color?: string }) {
    if (!workspaceId) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setGroups(groups.map((g) => (g.id === id ? { ...g, ...data } : g)));
  }

  async function deleteGroup(id: string) {
    if (!workspaceId) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/groups/${id}`, { method: 'DELETE' });
    setGroups(groups.filter((g) => g.id !== id));
    showMsg('Group deleted');
  }

  async function reorderGroups(orderedIds: string[]) {
    if (!workspaceId) {
      return;
    }
    const reordered = orderedIds.map((id, i) => {
      const g = groups.find((x) => x.id === id)!;
      return { ...g, position: i };
    });
    setGroups(reordered);
    await fetch(`/api/workspaces/${workspaceId}/groups/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
  }

  // ── Project handlers ──
  async function addProject(name: string) {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const p = await res.json();
      setProjects([...projects, p]);
      router.refresh();
    }
  }

  async function updateProject(id: string, data: { name?: string }) {
    if (!workspaceId) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setProjects(projects.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }

  async function deleteProject(id: string) {
    if (!workspaceId) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/projects/${id}`, { method: 'DELETE' });
    setProjects(projects.filter((p) => p.id !== id));
    showMsg('Project deleted');
    router.refresh();
  }

  async function reorderProjects(orderedIds: string[]) {
    if (!workspaceId) {
      return;
    }
    const reordered = orderedIds.map((id, i) => {
      const p = projects.find((x) => x.id === id)!;
      return { ...p, position: i };
    });
    setProjects(reordered);
    await fetch(`/api/workspaces/${workspaceId}/projects/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
  }

  // ── Custom field handlers ──
  async function createField(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !newFieldName.trim()) {
      return;
    }
    const config: Record<string, unknown> = {};
    if (['dropdown', 'multi_select'].includes(newFieldType) && newFieldOptions.trim()) {
      config.options = newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean);
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/custom-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFieldName.trim(), type: newFieldType, config }),
    });
    if (res.ok) {
      const created = await res.json();
      setFields([...fields, created]);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
      setShowCreateField(false);
      showMsg('Field created');
    }
  }

  async function deleteField(fieldId: string) {
    if (!workspaceId) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/custom-fields/${fieldId}`, { method: 'DELETE' });
    setFields(fields.filter((f) => f.id !== fieldId));
    showMsg('Field deleted');
  }

  // ── Member handlers ──
  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !inviteEmail.trim()) {
      return;
    }
    setInviting(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    const data = await res.json();
    showMsg(res.ok ? `Invitation sent to ${inviteEmail}` : data.error || 'Failed');
    if (res.ok) {
      setInviteEmail('');
    }
    setInviting(false);
  }

  async function changeRole(memberId: string, role: string) {
    if (!workspaceId) {
      return;
    }
    const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, role }),
    });
    if (res.ok) {
      setMembers(await (await fetch(`/api/workspaces/${workspaceId}/members`)).json());
    }
  }

  async function removeMember(memberId: string, email: string) {
    if (!workspaceId) {
      return;
    }
    await fetch(`/api/workspaces/${workspaceId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    setMembers(members.filter((m) => m.id !== memberId));
    setRemoveMemberConfirm(null);
    showMsg(`${email} removed`);
  }

  // ── SLA handlers ──
  async function saveSla() {
    if (!workspaceId) {
      return;
    }
    setSavingSla(true);
    await fetch(`/api/workspaces/${workspaceId}/sla-rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slaRules),
    });
    showMsg('SLA rules saved');
    setSavingSla(false);
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'general', label: 'General' },
    { key: 'task-views', label: 'Task Views' },
    { key: 'members', label: 'Members' },
    { key: 'sla', label: 'SLA Rules' },
  ];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {message && (
        <p className="mt-3 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {tabs.map((t) => (
          <button
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
            key={t.key}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* ── GENERAL TAB ── */}
        {tab === 'general' && (
          <div className="space-y-6">
            {/* Public Form URL */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Public Ticket Form</h2>
              <code className="mt-2 block rounded bg-gray-100 px-3 py-2 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {typeof window !== 'undefined' ? window.location.origin : ''}/submit/{params.slug}
              </code>
            </div>

            {/* Projects */}
            <ConfigurableItemList
              addLabel="Add Project"
              items={projects.map((p) => ({ id: p.id, name: p.name, color: '#3B82F6', position: p.position ?? 0 }))}
              onAdd={async (name) => addProject(name)}
              onDelete={deleteProject}
              onReorder={reorderProjects}
              onUpdate={updateProject}
              title="Projects"
              description="Manage and reorder projects"
            />
          </div>
        )}

        {/* ── TASK VIEWS TAB ── */}
        {tab === 'task-views' && (
          <div className="space-y-4">
            {/* Statuses */}
            <ConfigurableItemList
              addLabel="Add Status"
              items={statuses.map((s, i) => ({ id: `status-${i}`, name: s.name, color: s.color, position: i, extra: { category: s.category } }))}
              onAdd={async (name, color) => {
                const updated = [...statuses, { name, color, category: 'todo' }];
                setStatuses(updated);
                await saveStatuses(updated);
              }}
              onDelete={async (id) => {
                const idx = parseInt(id.replace('status-', ''));
                const updated = statuses.filter((_, i) => i !== idx);
                setStatuses(updated);
                await saveStatuses(updated);
              }}
              onReorder={async (orderedIds) => {
                const reordered = orderedIds.map((id) => {
                  const idx = parseInt(id.replace('status-', ''));
                  return statuses[idx];
                });
                setStatuses(reordered);
                await saveStatuses(reordered);
              }}
              onUpdate={async (id, data) => {
                const idx = parseInt(id.replace('status-', ''));
                const updated = [...statuses];
                if (data.name) {
                  updated[idx] = { ...updated[idx], name: data.name };
                }
                if (data.color) {
                  updated[idx] = { ...updated[idx], color: data.color };
                }
                setStatuses(updated);
                await saveStatuses(updated);
              }}
              showCategory
              categories={STATUS_CATEGORIES}
              getCategory={(item) => {
                const cat = (item.extra as Record<string, string>)?.category ?? 'todo';
                return STATUS_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
              }}
              onCategoryChange={(id, category) => {
                const idx = parseInt(id.replace('status-', ''));
                const updated = [...statuses];
                updated[idx] = { ...updated[idx], category };
                setStatuses(updated);
                saveStatuses(updated);
              }}
              title="Statuses"
              description="Used in table views and kanban columns"
            />

            {/* Priorities */}
            <ConfigurableItemList
              addLabel="Add Priority"
              items={priorities.map((p, i) => ({ id: `priority-${i}`, name: p.label, color: p.color, position: i }))}
              onAdd={async () => {}}
              onDelete={async () => {}}
              onReorder={async (orderedIds) => {
                const reordered = orderedIds.map((id) => {
                  const idx = parseInt(id.replace('priority-', ''));
                  return priorities[idx];
                });
                setPriorities(reordered);
              }}
              onUpdate={async (id, data) => {
                const idx = parseInt(id.replace('priority-', ''));
                const updated = [...priorities];
                if (data.name) {
                  updated[idx] = { ...updated[idx], label: data.name };
                }
                if (data.color) {
                  updated[idx] = { ...updated[idx], color: data.color };
                }
                setPriorities(updated);
              }}
              title="Priorities"
              description="Priority level display names and colors"
            />

            {/* Groups */}
            <ConfigurableItemList
              addLabel="Add Group"
              items={groups.map((g, i) => ({ id: g.id, name: g.name, color: g.color, position: g.position ?? i }))}
              onAdd={addGroup}
              onDelete={deleteGroup}
              onReorder={reorderGroups}
              onUpdate={updateGroup}
              title="Task Groups"
              description="Cross-project task grouping"
            />

            {/* Custom Fields */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Custom Fields</h3>
                  <span className="text-xs text-gray-400">{fields.length}/50 fields</span>
                </div>
                <button
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  onClick={() => setShowCreateField(!showCreateField)}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </button>
              </div>

              {showCreateField && (
                <form className="border-t border-gray-100 px-4 py-3 dark:border-gray-800" onSubmit={createField}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        id="fieldName"
                        label="Name"
                        onChange={(e) => setNewFieldName(e.target.value)}
                        required
                        value={newFieldName}
                      />
                    </div>
                    <div className="w-40">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        onChange={(e) => setNewFieldType(e.target.value)}
                        value={newFieldType}
                      >
                        {FIELD_TYPES.map((ft) => (
                          <option key={ft.value} value={ft.value}>{ft.label}</option>
                        ))}
                      </select>
                    </div>
                    <Button size="sm" type="submit">Create</Button>
                    <button
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => setShowCreateField(false)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {['dropdown', 'multi_select'].includes(newFieldType) && (
                    <Input
                      className="mt-2"
                      id="options"
                      label="Options (comma-separated)"
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      placeholder="Option 1, Option 2"
                      value={newFieldOptions}
                    />
                  )}
                </form>
              )}

              <div className="border-t border-gray-100 dark:border-gray-800">
                {fields.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">No custom fields yet</p>
                )}
                {fields.map((field) => (
                  <div
                    className="flex items-center justify-between border-b border-gray-50 px-4 py-2.5 last:border-b-0 dark:border-gray-800/50"
                    key={field.id}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 dark:text-white">{field.name}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {FIELD_TYPES.find((ft) => ft.value === field.type)?.label ?? field.type}
                      </span>
                    </div>
                    {deleteFieldConfirm === field.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-600 dark:text-red-400">Delete?</span>
                        <button className="text-xs font-medium text-red-600" onClick={() => { deleteField(field.id); setDeleteFieldConfirm(null); }} type="button">Yes</button>
                        <button className="text-xs text-gray-500" onClick={() => setDeleteFieldConfirm(null)} type="button">No</button>
                      </div>
                    ) : (
                      <button
                        className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-900/30"
                        onClick={() => setDeleteFieldConfirm(field.id)}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MEMBERS TAB ── */}
        {tab === 'members' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Invite Member</h2>
              <form className="mt-3 flex gap-2" onSubmit={inviteMember}>
                <Input
                  className="flex-1"
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  type="email"
                  value={inviteEmail}
                />
                <select
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  onChange={(e) => setInviteRole(e.target.value)}
                  value={inviteRole}
                >
                  <option value="MEMBER">Member</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <Button loading={inviting} type="submit">Invite</Button>
              </form>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Members ({members.length})</h2>
              <table className="mt-3 w-full">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Role</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{m.user.name ?? '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{m.user.email}</td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded border-0 bg-transparent text-xs font-medium text-gray-700 dark:text-gray-300"
                          disabled={m.role === 'SUPER_ADMIN'}
                          onChange={(e) => changeRole(m.id, e.target.value)}
                          value={m.role}
                        >
                          <option value="SUPER_ADMIN">Super Admin</option>
                          <option value="ADMIN">Admin</option>
                          <option value="MANAGER">Manager</option>
                          <option value="MEMBER">Member</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {m.role !== 'SUPER_ADMIN' && (
                          removeMemberConfirm === m.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-red-600 dark:text-red-400">Remove?</span>
                              <button className="text-xs font-medium text-red-600" onClick={() => removeMember(m.id, m.user.email)} type="button">Yes</button>
                              <button className="text-xs text-gray-500" onClick={() => setRemoveMemberConfirm(null)} type="button">Cancel</button>
                            </div>
                          ) : (
                            <button
                              className="text-xs text-red-600 hover:underline dark:text-red-400"
                              onClick={() => setRemoveMemberConfirm(m.id)}
                              type="button"
                            >
                              Remove
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SLA RULES TAB ── */}
        {tab === 'sla' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">SLA Rules</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Set response and resolution time targets for tickets by priority (in minutes).
            </p>
            <table className="mt-4 w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Priority</th>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Response (min)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Resolution (min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {slaRules.map((rule, idx) => (
                  <tr key={rule.priority}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">{rule.priority}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        onChange={(e) => {
                          const updated = [...slaRules];
                          updated[idx] = { ...updated[idx], responseTime: parseInt(e.target.value) || 0 };
                          setSlaRules(updated);
                        }}
                        type="number"
                        value={rule.responseTime}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        onChange={(e) => {
                          const updated = [...slaRules];
                          updated[idx] = { ...updated[idx], resolutionTime: parseInt(e.target.value) || 0 };
                          setSlaRules(updated);
                        }}
                        type="number"
                        value={rule.resolutionTime}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button className="mt-4" loading={savingSla} onClick={saveSla}>Save SLA Rules</Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Button onClick={() => router.back()} variant="ghost">Back</Button>
      </div>
    </div>
  );
}
