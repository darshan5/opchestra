'use client';

import { Star } from 'lucide-react';

import { evaluateFormula } from '@/lib/formula';
import { cn } from '@/lib/utils';

interface FieldDefinition {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

interface TaskUser {
  id: string;
  name: string | null;
  email: string;
}

interface CustomFieldRendererProps {
  definition: FieldDefinition;
  value: unknown;
  allValues: Record<string, unknown>;
  members?: TaskUser[];
  onChange: (value: unknown) => void;
}

export function CustomFieldRenderer({
  allValues,
  definition,
  members = [],
  onChange,
  value,
}: CustomFieldRendererProps) {
  const { config, type } = definition;

  switch (type) {
    case 'text':
      return (
        <input
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          defaultValue={(value as string) ?? ''}
          onBlur={(e) => onChange(e.target.value)}
          type="text"
        />
      );

    case 'long_text':
      return (
        <textarea
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          defaultValue={(value as string) ?? ''}
          onBlur={(e) => onChange(e.target.value)}
          rows={2}
        />
      );

    case 'number':
      return (
        <input
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          defaultValue={(value as number) ?? ''}
          onBlur={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          type="number"
        />
      );

    case 'checkbox':
      return (
        <button
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700',
          )}
          onClick={() => onChange(!value)}
          type="button"
        >
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
              value ? 'translate-x-4' : 'translate-x-0.5',
            )}
          />
        </button>
      );

    case 'dropdown': {
      const options = (config.options as string[]) ?? [];
      return (
        <select
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          onChange={(e) => onChange(e.target.value || null)}
          value={(value as string) ?? ''}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    case 'multi_select': {
      const options = (config.options as string[]) ?? [];
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs transition-colors',
                  isSelected
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
                )}
                key={opt}
                onClick={() => {
                  const next = isSelected
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt];
                  onChange(next);
                }}
                type="button"
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    case 'date':
      return (
        <input
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          onChange={(e) => onChange(e.target.value || null)}
          type="date"
          value={(value as string) ?? ''}
        />
      );

    case 'hour':
      return (
        <input
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          onChange={(e) => onChange(e.target.value || null)}
          type="time"
          value={(value as string) ?? ''}
        />
      );

    case 'person':
      return (
        <select
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          onChange={(e) => onChange(e.target.value || null)}
          value={(value as string) ?? ''}
        >
          <option value="">Select person...</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
          ))}
        </select>
      );

    case 'url':
      return (
        <input
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          defaultValue={(value as string) ?? ''}
          onBlur={(e) => onChange(e.target.value || null)}
          placeholder="https://..."
          type="url"
        />
      );

    case 'email':
      return (
        <input
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          defaultValue={(value as string) ?? ''}
          onBlur={(e) => onChange(e.target.value || null)}
          placeholder="email@..."
          type="email"
        />
      );

    case 'phone':
      return (
        <input
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          defaultValue={(value as string) ?? ''}
          onBlur={(e) => onChange(e.target.value || null)}
          placeholder="+1..."
          type="tel"
        />
      );

    case 'files':
      return (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          File storage not configured
        </p>
      );

    case 'rating': {
      const rating = typeof value === 'number' ? value : 0;
      return (
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => onChange(star === rating ? 0 : star)}
              type="button"
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  star <= rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600',
                )}
              />
            </button>
          ))}
        </div>
      );
    }

    case 'currency': {
      const symbol = (config.symbol as string) ?? '$';
      return (
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-500">{symbol}</span>
          <input
            className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
            defaultValue={(value as number) ?? ''}
            onBlur={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            step="0.01"
            type="number"
          />
        </div>
      );
    }

    case 'formula': {
      const formula = (config.formula as string) ?? '';
      const result = evaluateFormula(formula, allValues);
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {result}
        </span>
      );
    }

    case 'location':
      return (
        <input
          className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-sm dark:border-gray-700 dark:text-gray-200"
          defaultValue={(value as string) ?? ''}
          onBlur={(e) => onChange(e.target.value || null)}
          placeholder="Address..."
          type="text"
        />
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            className="h-7 w-7 cursor-pointer rounded border-0"
            onChange={(e) => onChange(e.target.value)}
            type="color"
            value={(value as string) ?? '#6B7280'}
          />
          <span className="text-xs text-gray-400">{(value as string) ?? '#6B7280'}</span>
        </div>
      );

    default:
      return <span className="text-xs text-gray-400">Unsupported type: {type}</span>;
  }
}
