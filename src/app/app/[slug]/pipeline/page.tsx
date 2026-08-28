'use client';

import { ChevronDown, Plus, User } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface ContactCard {
  id: string;
  name: string;
  email: string | null;
  companyName: string | null;
  pipelineStageId: string | null;
}

interface PipelineData {
  id: string;
  name: string;
  stages: Stage[];
}

export default function SalesPipelinePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [contacts, setContacts] = useState<ContactCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingContact, setMovingContact] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const pipRes = await fetch(`/api/workspaces/${ws.id}/pipelines?type=SALES`);
      if (!pipRes.ok) return;
      const pipelines = await pipRes.json();

      if (pipelines.length > 0) {
        const detailRes = await fetch(`/api/workspaces/${ws.id}/pipelines/${pipelines[0].id}`);
        if (detailRes.ok) {
          setPipeline(await detailRes.json());
        }

        const conRes = await fetch(`/api/workspaces/${ws.id}/contacts`);
        if (conRes.ok) {
          const allContacts = await conRes.json();
          setContacts(allContacts.map((c: { id: string; name: string; email: string | null; company: { name: string } | null; pipelineStageId: string | null }) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            companyName: c.company?.name ?? null,
            pipelineStageId: c.pipelineStageId,
          })));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function createPipeline() {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sales Pipeline',
        type: 'SALES',
        stages: [
          { name: 'New Lead', color: '#6366f1' },
          { name: 'Qualified', color: '#3b82f6' },
          { name: 'Proposal', color: '#f59e0b' },
          { name: 'Won', color: '#22c55e' },
          { name: 'Lost', color: '#ef4444' },
        ],
      }),
    });
    fetchData();
  }

  async function moveContact(contactId: string, stageId: string | null) {
    if (!workspaceId) return;
    setMovingContact(null);
    await fetch(`/api/workspaces/${workspaceId}/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineStageId: stageId }),
    });
    setContacts((prev) => prev.map((c) => c.id === contactId ? { ...c, pipelineStageId: stageId } : c));
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  if (!pipeline) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Pipeline</h1>
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No sales pipeline configured yet.</p>
          <button
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={createPipeline}
          >
            Create Sales Pipeline
          </button>
        </div>
      </div>
    );
  }

  const stages = [...pipeline.stages].sort((a, b) => a.position - b.position);
  const unstaged = contacts.filter((c) => !c.pipelineStageId || !stages.some((s) => s.id === c.pipelineStageId));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pipeline.name}</h1>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {stages.map((stage) => {
          const stageContacts = contacts.filter((c) => c.pipelineStageId === stage.id);
          return (
            <div className="flex w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50" key={stage.id}>
              <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-800">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{stage.name}</span>
                <span className="ml-auto text-xs text-gray-400">{stageContacts.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {stageContacts.map((contact) => (
                  <div className="relative rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900" key={contact.id}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{contact.name}</p>
                        {contact.email && <p className="truncate text-xs text-gray-500">{contact.email}</p>}
                        {contact.companyName && <p className="mt-0.5 truncate text-xs text-gray-400">{contact.companyName}</p>}
                      </div>
                      <button
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setMovingContact(movingContact === contact.id ? null : contact.id)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {movingContact === contact.id && (
                      <div className="absolute right-2 top-10 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                        {stages.filter((s) => s.id !== stage.id).map((s) => (
                          <button
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                            key={s.id}
                            onClick={() => moveContact(contact.id, s.id)}
                          >
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {stageContacts.length === 0 && (
                  <p className="py-4 text-center text-xs text-gray-400">No contacts</p>
                )}
              </div>
            </div>
          );
        })}

        {unstaged.length > 0 && (
          <div className="flex w-72 shrink-0 flex-col rounded-lg border border-dashed border-gray-300 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30">
            <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-800">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Unassigned</span>
              <span className="ml-auto text-xs text-gray-400">{unstaged.length}</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {unstaged.map((contact) => (
                <div className="relative rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900" key={contact.id}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{contact.name}</p>
                      {contact.email && <p className="truncate text-xs text-gray-500">{contact.email}</p>}
                    </div>
                    <button
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setMovingContact(movingContact === contact.id ? null : contact.id)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {movingContact === contact.id && (
                    <div className="absolute right-2 top-10 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                      {stages.map((s) => (
                        <button
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                          key={s.id}
                          onClick={() => moveContact(contact.id, s.id)}
                        >
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
