'use client';

import { formatDistanceToNow } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface NoteData {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  createdBy: { id: string; name: string | null; email: string };
}

interface NotesSectionProps {
  workspaceId: string;
  entityType: string;
  entityId: string;
  isAdmin?: boolean;
  showCategories?: boolean;
}

const CATEGORY_STYLES: Record<string, { label: string; border: string; badge: string }> = {
  client_comment: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    border: 'border-l-blue-500',
    label: 'Client',
  },
  general: {
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    border: 'border-l-gray-400',
    label: 'Note',
  },
  internal: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    border: 'border-l-amber-500',
    label: 'Internal',
  },
};

export function NotesSection({ entityId, entityType, isAdmin, showCategories, workspaceId }: NotesSectionProps) {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [newNote, setNewNote] = useState('');
  const [sending, setSending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(
      `/api/workspaces/${workspaceId}/notes?entityType=${entityType}&entityId=${entityId}`,
    );
    if (res.ok) {
      setNotes(await res.json());
    }
  }, [workspaceId, entityType, entityId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function addNote(category: string) {
    if (!newNote.trim()) {
      return;
    }
    setSending(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, content: newNote.trim(), category }),
    });
    if (res.ok) {
      const created = await res.json();
      setNotes([created, ...notes]);
      setNewNote('');
    }
    setSending(false);
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(`/api/workspaces/${workspaceId}/notes/${noteId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setNotes(notes.filter((n) => n.id !== noteId));
    }
    setDeleteConfirm(null);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
        Notes
      </h3>

      <div>
        <textarea
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          disabled={sending}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          value={newNote}
        />
        <div className="mt-1.5 flex gap-2">
          {showCategories ? (
            <>
              <button
                className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!newNote.trim() || sending}
                onClick={() => addNote('client_comment')}
                type="button"
              >
                Client Comment
              </button>
              <button
                className="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                disabled={!newNote.trim() || sending}
                onClick={() => addNote('internal')}
                type="button"
              >
                Internal Note
              </button>
            </>
          ) : (
            <button
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!newNote.trim() || sending}
              onClick={() => addNote('general')}
              type="button"
            >
              Add Note
            </button>
          )}
        </div>
      </div>

      {notes.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">No notes yet</p>
      )}

      <div className="space-y-2">
        {notes.map((note) => {
          const style = CATEGORY_STYLES[note.category] ?? CATEGORY_STYLES.general;
          return (
            <div
              className={cn(
                'rounded-lg border border-gray-200 border-l-4 bg-white p-3 dark:border-gray-700 dark:bg-gray-900',
                style.border,
              )}
              key={note.id}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {note.createdBy.name ?? note.createdBy.email}
                  </span>
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', style.badge)}>
                    {style.label}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {isAdmin && (
                  <div>
                    {deleteConfirm === note.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          className="text-[10px] font-medium text-red-600 hover:text-red-700"
                          onClick={() => deleteNote(note.id)}
                          type="button"
                        >
                          Delete
                        </button>
                        <button
                          className="text-[10px] text-gray-400"
                          onClick={() => setDeleteConfirm(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="rounded p-0.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400"
                        onClick={() => setDeleteConfirm(note.id)}
                        title="Delete note"
                        type="button"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {note.content}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
