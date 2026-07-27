'use client';

import { formatDistanceToNow } from 'date-fns';
import { Building2, Info, Plus, Search, UserRound } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { CompanyDetailPanel } from '@/components/contacts/company-detail-panel';
import { ContactDetailPanel } from '@/components/contacts/contact-detail-panel';
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

interface CompanyData {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  _count: { contacts: number };
  createdAt: string;
}

export default function ContactsPage() {
  const params = useParams<{ slug: string }>();
  const [tab, setTab] = useState<'companies' | 'people'>('companies');
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [search, setSearch] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Add contact fields
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Add company fields
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newIndustry, setNewIndustry] = useState('');

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

  const loadData = useCallback(async () => {
    if (!workspaceId) {
      return;
    }
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    if (tab === 'companies') {
      const res = await fetch(`/api/workspaces/${workspaceId}/companies${q}`);
      if (res.ok) {
        setCompanies(await res.json());
      }
    } else {
      const res = await fetch(`/api/workspaces/${workspaceId}/contacts${q}`);
      if (res.ok) {
        setContacts(await res.json());
      }
    }
  }, [workspaceId, search, tab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      loadData();
    }
    setSaving(false);
  }

  async function createCompany() {
    if (!newCompanyName.trim()) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCompanyName,
        domain: newDomain || undefined,
        industry: newIndustry || undefined,
      }),
    });
    if (res.ok) {
      setNewCompanyName('');
      setNewDomain('');
      setNewIndustry('');
      setShowAdd(false);
      loadData();
    }
    setSaving(false);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <div className="mt-2 flex gap-2">
            <button
              className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === 'companies'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
              onClick={() => { setTab('companies'); setSearch(''); }}
            >
              <Building2 className="mr-1 h-4 w-4" />
              Companies
            </button>
            <button
              className={`flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === 'people'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
              onClick={() => { setTab('people'); setSearch(''); }}
            >
              <UserRound className="mr-1 h-4 w-4" />
              People
            </button>
          </div>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          {tab === 'companies' ? 'Add Company' : 'Add Contact'}
        </Button>
      </div>

      {/* Add form */}
      {showAdd && tab === 'companies' && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-3 gap-3">
            <Input id="cname" label="Name" onChange={(e) => setNewCompanyName(e.target.value)} required value={newCompanyName} />
            <Input id="cdomain" label="Domain" onChange={(e) => setNewDomain(e.target.value)} placeholder="acme.com" value={newDomain} />
            <Input id="cindustry" label="Industry" onChange={(e) => setNewIndustry(e.target.value)} value={newIndustry} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={saving} onClick={createCompany} size="sm">Save</Button>
            <Button onClick={() => setShowAdd(false)} size="sm" variant="ghost">Cancel</Button>
          </div>
        </div>
      )}
      {showAdd && tab === 'people' && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-3">
            <Input id="pname" label="Name" onChange={(e) => setNewName(e.target.value)} required value={newName} />
            <Input id="pemail" label="Email" onChange={(e) => setNewEmail(e.target.value)} type="email" value={newEmail} />
            <Input id="pphone" label="Phone" onChange={(e) => setNewPhone(e.target.value)} value={newPhone} />
            <Input id="ptitle" label="Title" onChange={(e) => setNewTitle(e.target.value)} value={newTitle} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={saving} onClick={createContact} size="sm">Save</Button>
            <Button onClick={() => setShowAdd(false)} size="sm" variant="ghost">Cancel</Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mt-4">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'companies' ? 'Search companies...' : 'Search contacts...'}
            value={search}
          />
        </div>
      </div>

      {/* Companies table */}
      {tab === 'companies' && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Domain</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Industry</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Contacts</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Added</th>
                <th className="w-10 px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {companies.map((c) => (
                <tr className="group hover:bg-gray-50 dark:hover:bg-gray-900" key={c.id}>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{c.domain ?? '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{c.industry ?? '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{c._count.contacts}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      onClick={() => setSelectedCompanyId(c.id)}
                      title="View details"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={6}>No companies yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* People table */}
      {tab === 'people' && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Company</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">Added</th>
                <th className="w-10 px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {contacts.map((c) => (
                <tr className="group hover:bg-gray-50 dark:hover:bg-gray-900" key={c.id}>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{c.email ?? '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{c.phone ?? '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {c.company ? (
                      <button
                        className="text-blue-600 hover:underline dark:text-blue-400"
                        onClick={() => setSelectedCompanyId(c.company!.id)}
                      >
                        {c.company.name}
                      </button>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{c.title ?? '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                      onClick={() => setSelectedContactId(c.id)}
                      title="View details"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={7}>No contacts yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Company detail panel */}
      {selectedCompanyId && workspaceId && (
        <CompanyDetailPanel
          companyId={selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
          onUpdated={loadData}
          workspaceId={workspaceId}
        />
      )}

      {/* Contact detail panel */}
      {selectedContactId && workspaceId && (
        <ContactDetailPanel
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
          onOpenCompany={(cid) => {
            setSelectedContactId(null);
            setSelectedCompanyId(cid);
          }}
          onUpdated={loadData}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
