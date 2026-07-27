'use client';

import { formatDistanceToNow } from 'date-fns';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

interface ContactData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
}

interface CompanyDetail {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  notes: string | null;
  contacts: ContactData[];
  _count: { contacts: number; ticketsByCompany?: number };
  createdAt: string;
}

interface CompanyDetailPanelProps {
  companyId: string;
  workspaceId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function CompanyDetailPanel({
  companyId,
  onClose,
  onUpdated,
  workspaceId,
}: CompanyDetailPanelProps) {
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactTitle, setNewContactTitle] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/companies/${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data);
        setName(data.name);
        setDomain(data.domain ?? '');
        setIndustry(data.industry ?? '');
        setNotes(data.notes ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, companyId]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  async function saveField(field: string, value: string) {
    setSaving(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/companies/${companyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value || null }),
    });
    if (res.ok) {
      onUpdated();
    }
    setSaving(false);
  }

  async function addContact() {
    if (!newContactName.trim()) {
      return;
    }
    setSavingContact(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newContactName,
        email: newContactEmail || undefined,
        phone: newContactPhone || undefined,
        title: newContactTitle || undefined,
        companyId,
      }),
    });
    if (res.ok) {
      setNewContactName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewContactTitle('');
      setShowAddContact(false);
      fetchCompany();
      onUpdated();
    }
    setSavingContact(false);
  }

  async function updateContact(contactId: string, data: Record<string, string | null>) {
    await fetch(`/api/workspaces/${workspaceId}/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchCompany();
    setEditingContactId(null);
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

  if (!company) {
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
                if (name !== company.name) {
                  saveField('name', name);
                }
              }}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setEditingName(false);
                  if (name !== company.name) {
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
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Domain</label>
              <input
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                onBlur={() => {
                  if (domain !== (company.domain ?? '')) {
                    saveField('domain', domain);
                  }
                }}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="acme.com"
                value={domain}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Industry</label>
              <input
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                onBlur={() => {
                  if (industry !== (company.industry ?? '')) {
                    saveField('industry', industry);
                  }
                }}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Technology"
                value={industry}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Notes</label>
              <textarea
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                onBlur={() => {
                  if (notes !== (company.notes ?? '')) {
                    saveField('notes', notes);
                  }
                }}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes about this company..."
                rows={3}
                value={notes}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{company._count.contacts} contact{company._count.contacts !== 1 ? 's' : ''}</span>
            {company._count.ticketsByCompany !== undefined && (
              <span>{company._count.ticketsByCompany} ticket{company._count.ticketsByCompany !== 1 ? 's' : ''}</span>
            )}
            <span>Added {formatDistanceToNow(new Date(company.createdAt), { addSuffix: true })}</span>
          </div>
          {saving && <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Saving...</p>}
        </div>

        {/* People */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">People</h3>
            <button
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
              onClick={() => setShowAddContact(!showAddContact)}
            >
              <Plus className="h-3 w-3" />
              Add Contact
            </button>
          </div>

          {showAddContact && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Name *"
                  value={newContactName}
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  value={newContactEmail}
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="Phone"
                  value={newContactPhone}
                />
                <input
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setNewContactTitle(e.target.value)}
                  placeholder="Title"
                  value={newContactTitle}
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Button loading={savingContact} onClick={addContact} size="sm">
                  Add
                </Button>
                <Button onClick={() => setShowAddContact(false)} size="sm" variant="ghost">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="mt-3 space-y-1">
            {company.contacts.map((contact) => (
              <div
                className="rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                key={contact.id}
              >
                {editingContactId === contact.id ? (
                  <EditContactRow
                    contact={contact}
                    onCancel={() => setEditingContactId(null)}
                    onSave={(data) => updateContact(contact.id, data)}
                  />
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => setEditingContactId(contact.id)}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {contact.name}
                    </p>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                      {contact.title && <span>{contact.title}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {company.contacts.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                No contacts yet
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EditContactRow({
  contact,
  onCancel,
  onSave,
}: {
  contact: ContactData;
  onCancel: () => void;
  onSave: (data: Record<string, string | null>) => void;
}) {
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email ?? '');
  const [phone, setPhone] = useState(contact.phone ?? '');
  const [title, setTitle] = useState(contact.title ?? '');

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          value={name}
        />
        <input
          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          value={email}
        />
        <input
          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          value={phone}
        />
        <input
          className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          value={title}
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() =>
            onSave({
              name,
              email: email || null,
              phone: phone || null,
              title: title || null,
            })
          }
          size="sm"
        >
          Save
        </Button>
        <Button onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
      </div>
    </div>
  );
}
