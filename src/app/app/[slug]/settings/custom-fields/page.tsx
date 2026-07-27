'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FieldDef {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  position: number;
}

const FIELD_TYPES = [
  { label: 'Text', value: 'text' },
  { label: 'Long Text', value: 'long_text' },
  { label: 'Number', value: 'number' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Dropdown', value: 'dropdown' },
  { label: 'Multi-select', value: 'multi_select' },
  { label: 'Date', value: 'date' },
  { label: 'Hour', value: 'hour' },
  { label: 'Person', value: 'person' },
  { label: 'URL', value: 'url' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
  { label: 'Files', value: 'files' },
  { label: 'Rating', value: 'rating' },
  { label: 'Currency', value: 'currency' },
  { label: 'Formula', value: 'formula' },
  { label: 'Location', value: 'location' },
  { label: 'Color', value: 'color' },
];

export default function CustomFieldsPage() {
  const params = useParams<{ slug: string }>();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [newOptions, setNewOptions] = useState('');
  const [newFormula, setNewFormula] = useState('');
  const [newSymbol, setNewSymbol] = useState('$');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((wss) => {
        const ws = wss.find((w: { slug: string }) => w.slug === params.slug);
        if (ws) {
          setWorkspaceId(ws.id);
        }
        setLoading(false);
      });
  }, [params.slug]);

  const fetchFields = useCallback(async () => {
    if (!workspaceId) { return; }
    const res = await fetch(`/api/workspaces/${workspaceId}/custom-fields`);
    if (res.ok) { setFields(await res.json()); }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) { fetchFields(); }
  }, [workspaceId, fetchFields]);

  async function createField(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !newName.trim()) { return; }
    setCreating(true);
    setMessage('');

    const config: Record<string, unknown> = {};
    if (['dropdown', 'multi_select'].includes(newType) && newOptions.trim()) {
      config.options = newOptions.split(',').map((o) => o.trim()).filter(Boolean);
    }
    if (newType === 'formula' && newFormula.trim()) {
      config.formula = newFormula.trim();
    }
    if (newType === 'currency') {
      config.symbol = newSymbol || '$';
    }

    const res = await fetch(`/api/workspaces/${workspaceId}/custom-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), type: newType, config }),
    });

    if (res.ok) {
      setNewName('');
      setNewType('text');
      setNewOptions('');
      setNewFormula('');
      setShowCreate(false);
      fetchFields();
      setMessage('Field created');
    } else {
      const data = await res.json();
      setMessage(data.error || 'Failed to create');
    }
    setCreating(false);
  }

  async function deleteField(fieldId: string, name: string) {
    if (!workspaceId || !confirm(`Delete custom field "${name}"? All values will be lost.`)) { return; }
    const res = await fetch(`/api/workspaces/${workspaceId}/custom-fields/${fieldId}`, { method: 'DELETE' });
    if (res.ok) {
      fetchFields();
      setMessage(`Field "${name}" deleted`);
    }
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Fields</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {fields.length}/50 fields used
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Field
        </Button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      {showCreate && (
        <form className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" onSubmit={createField}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">New Field</h3>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowCreate(false)} type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            <Input id="fieldName" label="Name" onChange={(e) => setNewName(e.target.value)} required value={newName} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                onChange={(e) => setNewType(e.target.value)}
                value={newType}
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>
            {['dropdown', 'multi_select'].includes(newType) && (
              <Input
                id="options"
                label="Options (comma-separated)"
                onChange={(e) => setNewOptions(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
                value={newOptions}
              />
            )}
            {newType === 'formula' && (
              <Input
                id="formula"
                label="Formula"
                onChange={(e) => setNewFormula(e.target.value)}
                placeholder="{Field1} + {Field2}"
                value={newFormula}
              />
            )}
            {newType === 'currency' && (
              <Input
                id="symbol"
                label="Currency Symbol"
                onChange={(e) => setNewSymbol(e.target.value)}
                value={newSymbol}
              />
            )}
            <Button loading={creating} type="submit">Create Field</Button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-2">
        {fields.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            No custom fields yet. Click &quot;Add Field&quot; to create one.
          </p>
        )}
        {fields.map((field) => (
          <div
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
            key={field.id}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{field.name}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {FIELD_TYPES.find((ft) => ft.value === field.type)?.label ?? field.type}
              </span>
            </div>
            <button
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              onClick={() => deleteField(field.id, field.name)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
