'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface FormField {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export default function PortalIntakePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const orderId = params.orderId as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [noForm, setNoForm] = useState(false);

  const fetchForm = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/orders/${orderId}/intake`);
      if (res.ok) {
        const data = await res.json();
        if (data.fields) {
          setFields(data.fields);
        } else {
          setNoForm(true);
        }
      } else {
        setNoForm(true);
      }
    } finally {
      setLoading(false);
    }
  }, [slug, orderId]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  function updateField(fieldId: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/orders/${orderId}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });
      if (res.ok) {
        router.push(`/portal/${slug}/orders/${orderId}`);
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to submit.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  if (noForm) {
    return (
      <div className="p-6">
        <Link
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          href={`/portal/${slug}/orders/${orderId}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order
        </Link>
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No intake form for this order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        href={`/portal/${slug}/orders/${orderId}`}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Order
      </Link>

      <div className="mx-auto mt-6 max-w-xl">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Intake Form</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please fill out the information below so we can get started on your order.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {fields.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
                {field.required && <span className="ml-0.5 text-red-500">*</span>}
              </label>

              {field.type === 'text' && (
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => updateField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  type="text"
                  value={(formData[field.id] as string) ?? ''}
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => updateField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={4}
                  value={(formData[field.id] as string) ?? ''}
                />
              )}

              {field.type === 'number' && (
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => updateField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  type="number"
                  value={(formData[field.id] as string) ?? ''}
                />
              )}

              {field.type === 'date' && (
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => updateField(field.id, e.target.value)}
                  required={field.required}
                  type="date"
                  value={(formData[field.id] as string) ?? ''}
                />
              )}

              {field.type === 'select' && (
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => updateField(field.id, e.target.value)}
                  required={field.required}
                  value={(formData[field.id] as string) ?? ''}
                >
                  <option value="">Select...</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.type === 'multiselect' && (
                <div className="mt-1 space-y-1">
                  {(field.options ?? []).map((opt) => {
                    const selected = ((formData[field.id] as string[]) ?? []).includes(opt);
                    return (
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300" key={opt}>
                        <input
                          checked={selected}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                          onChange={() => {
                            const current = ((formData[field.id] as string[]) ?? []);
                            const next = selected ? current.filter((v) => v !== opt) : [...current, opt];
                            updateField(field.id, next);
                          }}
                          type="checkbox"
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              )}

              {field.type === 'checkbox' && (
                <label className="mt-1 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    checked={!!formData[field.id]}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    onChange={(e) => updateField(field.id, e.target.checked)}
                    type="checkbox"
                  />
                  {field.placeholder || 'Yes'}
                </label>
              )}
            </div>
          ))}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
