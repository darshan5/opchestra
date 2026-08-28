'use client';

import { ChevronDown, Building2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface CompanyCard {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  pipelineStageId: string | null;
}

interface PipelineData {
  id: string;
  name: string;
  stages: Stage[];
}

export default function ProductionPipelinePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [pipeline, setPipeline] = useState<PipelineData | null>(null);
  const [companies, setCompanies] = useState<CompanyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingCompany, setMovingCompany] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const pipRes = await fetch(`/api/workspaces/${ws.id}/pipelines?type=PRODUCTION`);
      if (!pipRes.ok) return;
      const pipelines = await pipRes.json();

      if (pipelines.length > 0) {
        const detailRes = await fetch(`/api/workspaces/${ws.id}/pipelines/${pipelines[0].id}`);
        if (detailRes.ok) setPipeline(await detailRes.json());

        const compRes = await fetch(`/api/workspaces/${ws.id}/companies`);
        if (compRes.ok) {
          const all = await compRes.json();
          setCompanies(all.map((c: { id: string; name: string; domain: string | null; industry: string | null; pipelineStageId: string | null }) => ({
            id: c.id, name: c.name, domain: c.domain, industry: c.industry, pipelineStageId: c.pipelineStageId,
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
        name: 'Production Pipeline',
        type: 'PRODUCTION',
        stages: [
          { name: 'Onboarding', color: '#6366f1' },
          { name: 'In Progress', color: '#3b82f6' },
          { name: 'Review', color: '#f59e0b' },
          { name: 'Delivered', color: '#22c55e' },
        ],
      }),
    });
    fetchData();
  }

  async function moveCompany(companyId: string, stageId: string | null) {
    if (!workspaceId) return;
    setMovingCompany(null);
    await fetch(`/api/workspaces/${workspaceId}/companies/${companyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineStageId: stageId }),
    });
    setCompanies((prev) => prev.map((c) => c.id === companyId ? { ...c, pipelineStageId: stageId } : c));
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  if (!pipeline) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Production Pipeline</h1>
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No production pipeline configured yet.</p>
          <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={createPipeline}>
            Create Production Pipeline
          </button>
        </div>
      </div>
    );
  }

  const stages = [...pipeline.stages].sort((a, b) => a.position - b.position);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{pipeline.name}</h1>
      </div>
      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {stages.map((stage) => {
          const stageCompanies = companies.filter((c) => c.pipelineStageId === stage.id);
          return (
            <div className="flex w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50" key={stage.id}>
              <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-800">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{stage.name}</span>
                <span className="ml-auto text-xs text-gray-400">{stageCompanies.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2">
                {stageCompanies.map((company) => (
                  <div className="relative rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900" key={company.id}>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{company.name}</p>
                        {company.industry && <p className="truncate text-xs text-gray-500">{company.industry}</p>}
                        {company.domain && <p className="truncate text-xs text-gray-400">{company.domain}</p>}
                      </div>
                      <button className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setMovingCompany(movingCompany === company.id ? null : company.id)}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {movingCompany === company.id && (
                      <div className="absolute right-2 top-10 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                        {stages.filter((s) => s.id !== stage.id).map((s) => (
                          <button className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800" key={s.id} onClick={() => moveCompany(company.id, s.id)}>
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {stageCompanies.length === 0 && <p className="py-4 text-center text-xs text-gray-400">No companies</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
