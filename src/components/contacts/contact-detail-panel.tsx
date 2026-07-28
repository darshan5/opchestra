'use client';

import { formatDistanceToNow } from 'date-fns';
import { Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { NotesSection } from '@/components/notes/notes-section';
import { Button } from '@/components/ui/button';

interface CompanyOption {
  id: string;
  name: string;
}

interface TicketData {
  id: string;
  title: string;
  ticketNumber: string | null;
  status: string;
}

interface ContactDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  role: string | null;
  company: { id: string; name: string } | null;
  createdAt: string;
}

interface ContactDetailPanelProps {
  contactId: string;
  workspaceId: string;
  companies: CompanyOption[];
  onClose: () => void;
  onUpdated: () => void;
  onOpenCompany?: (companyId: string) => void;
}

export function ContactDetailPanel({
  companies,
  contactId,
  onClose,
  onOpenCompany,
  onUpdated,
  workspaceId,
}: ContactDetailPanelProps) {
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchContact = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/contacts/${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setContact(data);
        setName(data.name);
        setEmail(data.email ?? '');
        setPhone(data.phone ?? '');
        setTitle(data.title ?? '');
        setCompanyId(data.company?.id ?? '');
        if (data.tickets) {
          setTickets(data.tickets);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, contactId]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  async function saveField(field: string, value: string | null) {
    setSaving(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      onUpdated();
    }
    setSaving(false);
  }

  async function deleteContact() {
    await fetch(`/api/workspaces/${workspaceId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
    onUpdated();
    onClose();
  }

  if (loading) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-xl dark:bg-gray-950">
          <div className="flex h-14 items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (!contact) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-xl dark:bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          {editingName ? (
            <input
              autoFocus
              className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none dark:text-white"
              onBlur={() => {
                setEditingName(false);
                if (name !== contact.name) {
                  saveField('name', name);
                }
              }}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingName(false);
                  if (name !== contact.name) {
                    saveField('name', name);
                  }
                }
              }}
              value={name}
            />
          ) : (
            <h2
              className="cursor-pointer text-xl font-bold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
              onClick={() => setEditingName(true)}
            >
              {name}
            </h2>
          )}
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Details */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Details</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
              <input
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                onBlur={() => {
                  if (email !== (contact.email ?? '')) {
                    saveField('email', email || null);
                  }
                }}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                value={email}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
              <input
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                onBlur={() => {
                  if (phone !== (contact.phone ?? '')) {
                    saveField('phone', phone || null);
                  }
                }}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0100"
                value={phone}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Title / Role</label>
              <input
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                onBlur={() => {
                  if (title !== (contact.title ?? '')) {
                    saveField('title', title || null);
                  }
                }}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Marketing Director"
                value={title}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Company</label>
              <select
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  saveField('companyId', e.target.value || null);
                }}
                value={companyId}
              >
                <option value="">No company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {contact.company && onOpenCompany && (
                <button
                  className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  onClick={() => {
                    onClose();
                    onOpenCompany(contact.company!.id);
                  }}
                >
                  View {contact.company.name} details →
                </button>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Contact Role</label>
              <select
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                onChange={(e) => saveField('role', e.target.value || null)}
                value={contact.role ?? ''}
              >
                <option value="">No role</option>
                <option value="primary">Primary Contact</option>
                <option value="billing">Billing Contact</option>
                <option value="decision_maker">Decision Maker</option>
                <option value="technical">Technical Contact</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Added {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
          </div>
          {saving && <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Saving...</p>}
        </div>

        {/* Notes */}
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <NotesSection
            entityId={contactId}
            entityType="contact"
            isAdmin
            workspaceId={workspaceId}
          />
        </div>

        {/* Tickets */}
        {tickets.length > 0 && (
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tickets ({tickets.length})</h3>
            <div className="mt-2 space-y-1">
              {tickets.map((t) => (
                <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800" key={t.id}>
                  <div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t.ticketNumber ?? ''} </span>
                    <span className="text-sm text-gray-900 dark:text-white">{t.title}</span>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="px-6 py-4">
          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded bg-red-50 px-3 py-2 dark:bg-red-950">
              <span className="text-sm text-red-700 dark:text-red-300">Delete this contact?</span>
              <button
                className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                onClick={deleteContact}
              >
                Confirm
              </button>
              <button
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <Button onClick={() => setConfirmDelete(true)} size="sm" variant="danger">
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete Contact
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
