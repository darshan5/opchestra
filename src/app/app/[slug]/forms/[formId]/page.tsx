'use client';

import { ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder: string;
  options: string[];
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File Upload' },
  { value: 'hidden', label: 'Hidden' },
];

function generateId() {
  return 'f_' + Math.random().toString(36).slice(2, 10);
}

export default function FormBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const formId = params.formId as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('');
  const [published, setPublished] = useState(true);
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const fetchForm = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setFormName(data.name);
        setFormType(data.type);
        setPublished(data.published);
        setFields(Array.isArray(data.fields) ? data.fields : []);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, formId]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  function addField() {
    const newField: FormField = {
      id: generateId(),
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  }

  function updateField(id: string, updates: Partial<FormField>) {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function removeField(id: string) {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  }

  async function handleSave() {
    if (!workspaceId) return;
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/workspaces/${workspaceId}/forms/${formId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formName, published, fields }),
    });
    if (res.ok) setMessage('Form saved.');
    else setMessage('Failed to save.');
    setSaving(false);
  }

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        onClick={() => router.push(`/app/${slug}/forms`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Forms
      </button>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            className="border-b border-transparent bg-transparent text-2xl font-bold text-gray-900 focus:border-blue-500 focus:outline-none dark:text-white"
            onChange={(e) => setFormName(e.target.value)}
            value={formName}
          />
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {formType}
          </span>
        </div>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {message}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Field List */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Fields</h2>
            <button
              className="flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
              onClick={addField}
            >
              <Plus className="h-3 w-3" />
              Add Field
            </button>
          </div>

          {fields.length === 0 ? (
            <p className="mt-4 text-center text-sm text-gray-400 dark:text-gray-500">
              No fields yet. Add one to get started.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {fields.map((field) => (
                <div
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors',
                    selectedFieldId === field.id
                      ? 'border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30'
                      : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700',
                  )}
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {field.label || 'Untitled field'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type}
                      {field.required && ' · Required'}
                    </p>
                  </div>
                  <button
                    className="shrink-0 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(field.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Field Editor / Preview */}
        <div>
          {selectedField ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Edit Field</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Label</label>
                  <input
                    autoFocus
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    value={selectedField.label}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <select
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    onChange={(e) => updateField(selectedField.id, { type: e.target.value })}
                    value={selectedField.type}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Placeholder</label>
                  <input
                    className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                    value={selectedField.placeholder}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    checked={selectedField.required}
                    className="rounded"
                    onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                    type="checkbox"
                  />
                  Required
                </label>
                {(selectedField.type === 'select' || selectedField.type === 'multiselect') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Options (one per line)</label>
                    <textarea
                      className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      onChange={(e) => updateField(selectedField.id, { options: e.target.value.split('\n') })}
                      rows={4}
                      value={selectedField.options.join('\n')}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Preview</h3>
              {fields.length === 0 ? (
                <p className="mt-4 text-center text-sm text-gray-400">Add fields to see a preview.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {fields.map((field) => (
                    <div key={field.id}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {field.label || 'Untitled'}
                        {field.required && <span className="ml-1 text-red-500">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea className="mt-1 w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" disabled placeholder={field.placeholder} rows={3} />
                      ) : field.type === 'select' || field.type === 'multiselect' ? (
                        <select className="mt-1 w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" disabled>
                          <option>{field.placeholder || 'Select...'}</option>
                          {field.options.filter(Boolean).map((o) => (
                            <option key={o}>{o}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <label className="mt-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <input className="rounded" disabled type="checkbox" />
                          {field.placeholder || field.label}
                        </label>
                      ) : (
                        <input className="mt-1 w-full rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" disabled placeholder={field.placeholder} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
