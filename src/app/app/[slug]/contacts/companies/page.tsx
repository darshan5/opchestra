'use client';

import { formatDistanceToNow } from 'date-fns';
import { Building2, Plus, Search, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CompanyData {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  _count: { contacts: number };
  createdAt: string;
}

export default function CompaniesPage() {
  const params = useParams<{ slug: string }>();
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [search, setSearch] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
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

  const loadCompanies = useCallback(async () => {
    if (!workspaceId) {
      return;
    }
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/workspaces/${workspaceId}/companies${q}`);
    if (res.ok) {
      setCompanies(await res.json());
    }
  }, [workspaceId, search]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  async function createCompany() {
    if (!newName.trim()) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/workspaces/${workspaceId}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        domain: newDomain || undefined,
        industry: newIndustry || undefined,
      }),
    });
    if (res.ok) {
      setNewName('');
      setNewDomain('');
      setNewIndustry('');
      setShowAdd(false);
      loadCompanies();
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
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              href={`/app/${params.slug}/contacts`}
            >
              <UserRound className="mr-1 inline h-4 w-4" />
              People
            </Link>
            <Link
              className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              href={`/app/${params.slug}/contacts/companies`}
            >
              <Building2 className="mr-1 inline h-4 w-4" />
              Companies
            </Link>
          </div>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Company
        </Button>
      </div>

      {showAdd && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-3 gap-3">
            <Input
              id="name"
              label="Name"
              onChange={(e) => setNewName(e.target.value)}
              required
              value={newName}
            />
            <Input
              id="domain"
              label="Domain"
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="acme.com"
              value={newDomain}
            />
            <Input
              id="industry"
              label="Industry"
              onChange={(e) => setNewIndustry(e.target.value)}
              value={newIndustry}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button loading={saving} onClick={createCompany} size="sm">
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
            placeholder="Search companies..."
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
                Domain
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Industry
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Contacts
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                Added
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {companies.map((c) => (
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-900" key={c.id}>
                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">
                  {c.name}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {c.domain ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {c.industry ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {c._count.contacts}
                </td>
                <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={5}>
                  No companies yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
