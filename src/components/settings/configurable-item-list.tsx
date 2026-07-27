'use client';

import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface ConfigItem {
  id: string;
  name: string;
  color: string;
  position: number;
  extra?: Record<string, unknown>;
}

interface ConfigurableItemListProps {
  title: string;
  description?: string;
  items: ConfigItem[];
  onAdd: (name: string, color: string) => Promise<void>;
  onUpdate: (id: string, data: { name?: string; color?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
  addLabel?: string;
  showCategory?: boolean;
  categories?: Array<{ label: string; value: string }>;
  onCategoryChange?: (id: string, category: string) => void;
  getCategory?: (item: ConfigItem) => string;
  defaultCollapsed?: boolean;
}

export function ConfigurableItemList({
  addLabel = 'Add item',
  categories,
  defaultCollapsed = false,
  description,
  getCategory,
  items,
  onAdd,
  onCategoryChange,
  onDelete,
  onReorder,
  onUpdate,
  showCategory = false,
  title,
}: ConfigurableItemListProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6B7280');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(item: ConfigItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditColor(item.color);
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) {
      return;
    }
    await onUpdate(editingId, { name: editName.trim(), color: editColor });
    setEditingId(null);
  }

  async function handleAdd() {
    if (!newName.trim()) {
      return;
    }
    setSaving(true);
    await onAdd(newName.trim(), newColor);
    setNewName('');
    setNewColor('#6B7280');
    setAddingNew(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await onDelete(id);
    setConfirmDeleteId(null);
  }

  async function moveItem(fromIdx: number, direction: 'up' | 'down') {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= items.length) {
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    await onReorder(reordered.map((i) => i.id));
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <button
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={() => setCollapsed(!collapsed)}
        type="button"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="text-xs text-gray-400">({items.length})</span>
        </div>
        {description && !collapsed && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{description}</span>
        )}
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100 dark:border-gray-800">
          {items.length === 0 && !addingNew && (
            <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
              No items configured
            </p>
          )}

          {items.map((item, idx) => (
            <div
              className="flex items-center gap-2 border-b border-gray-50 px-3 py-2 last:border-b-0 dark:border-gray-800/50"
              key={item.id}
            >
              {/* Drag/reorder buttons */}
              <div className="flex flex-col">
                <button
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 dark:text-gray-600 dark:hover:text-gray-400"
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, 'up')}
                  title="Move up"
                  type="button"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </button>
              </div>

              {editingId === item.id ? (
                <>
                  <input
                    className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                    onChange={(e) => setEditColor(e.target.value)}
                    type="color"
                    value={editColor}
                  />
                  <input
                    autoFocus
                    className="flex-1 rounded border border-blue-400 bg-transparent px-2 py-1 text-sm text-gray-900 focus:outline-none dark:text-white"
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveEdit();
                      }
                      if (e.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    type="text"
                    value={editName}
                  />
                  {showCategory && categories && onCategoryChange && (
                    <select
                      className="rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      onChange={(e) => onCategoryChange(item.id, e.target.value)}
                      value={getCategory?.(item) ?? ''}
                    >
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  )}
                  <button
                    className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                    onClick={saveEdit}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setEditingId(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-700"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="flex-1 text-sm text-gray-900 dark:text-white">{item.name}</span>
                  {showCategory && getCategory && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {getCategory(item)}
                    </span>
                  )}

                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-red-500">Delete?</span>
                      <button
                        className="rounded px-1.5 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                        onClick={() => handleDelete(item.id)}
                        type="button"
                      >
                        Yes
                      </button>
                      <button
                        className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setConfirmDeleteId(null)}
                        type="button"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500 dark:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-400"
                        onClick={() => startEdit(item)}
                        title="Edit"
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:text-gray-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        onClick={() => setConfirmDeleteId(item.id)}
                        title="Delete"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}

          {/* Add new */}
          {addingNew ? (
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                onChange={(e) => setNewColor(e.target.value)}
                type="color"
                value={newColor}
              />
              <input
                autoFocus
                className="flex-1 rounded border border-blue-400 bg-transparent px-2 py-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdd();
                  }
                  if (e.key === 'Escape') {
                    setAddingNew(false);
                    setNewName('');
                  }
                }}
                placeholder="Name..."
                type="text"
                value={newName}
              />
              <button
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30',
                  saving && 'opacity-50',
                )}
                disabled={saving}
                onClick={handleAdd}
                type="button"
              >
                Add
              </button>
              <button
                className="rounded px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  setAddingNew(false);
                  setNewName('');
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="flex w-full items-center gap-1 px-4 py-2.5 text-xs text-blue-600 hover:bg-gray-50 dark:text-blue-400 dark:hover:bg-gray-800/50"
              onClick={() => setAddingNew(true)}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
