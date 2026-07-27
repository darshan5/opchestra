'use client';

import { formatDistanceToNow } from 'date-fns';
import { Building2, Plus, Search, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ContactData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company: { id: string; name: string } | null;
  createdAt: string;
}

export default function ContactsPage() {
  const params = useParams<{ slug: string }>();
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [search, setSearch] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/workspaces')
      .then((r) => r.json())
      .then((ws) => {
        const w = ws.find((x: { slug: string }) => x.slug === params.slug);
        if (w) {
          setWorkspaceId(w.id);
        }
      });
  }, [params.slug]);

  const loadContacts = useCallback(async () => {
    if (!workspaceId) {
      return;
    }
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/workspaces/${workspaceId}/contacts${q}`);
    if (res.ok) {
      setContacts(await res.json());
    }
  }, [workspaceId, search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  async function createContact() {
    if (!newName.trim()) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        email: newEmail || undefined,
        phone: newPhone || undefined,
        title: newTitle || undefined,
      }),
    });
    if (res.ok) {
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewTitle('');
      setShowAdd(false);
      loadContacts();
    }
    setSaving(false);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <div className="mt-2 flex gap-2">
            <Link
              className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              href={`/app/${params.slug}/contacts`}
            >
              <UserRound className="mr-1 inline h-4 w-4" />
              People
            </Link>
            <Link
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              href={`/app/${params.slug}/contacts/companies`}
            >
              <Building2 className="mr-1 inline h-4 w-4" />
              Companies
            </Link>
          </div>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {showAdd && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="name"
              label="Name"
              onChange={(e) => setNewName(e.target.value)}
              required
              value={newName}
            />
            <Input
              id="email"
              label="Email"
              onChange={(e) => setNewEmail(e.target.value)}
              type="email"
              value={newEmail}
            />
            <Input
              id="phone"
              label="Phone"
              onChange={(e) => setNewPhone(e.target.value)}
              value={newPhone}
            />
            <Input
              id="title"
              label="Title"
              onChange={(e) => setNewTitle(e.target.value)}
              value={newTitle}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={saving} onClick={createContact} size="sm">
              Save
            </Button>
            <Button onClick={() => setShowAdd(false)} size="sm" variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            value={search}
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Email
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Phone
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Company
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Title
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Added
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {contacts.map((c) => (
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" key={c.id}>
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                  {c.name}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {c.email ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {c.phone ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {c.company?.name ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {c.title ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={6}>
                  No contacts yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
