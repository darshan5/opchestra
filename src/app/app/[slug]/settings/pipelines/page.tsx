'use client';

import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface PipelineRow {
  id: string;
  name: string;
  type: string;
  stages: Stage[];
}

export default function PipelineSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [workspaceId, setWorkspaceId] = useState('');
  const [pipelines, setPipelines] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('SALES');
  const [editingStage, setEditingStage] = useState<{ pipelineId: string; stageId: string; name: string; color: string } | null>(null);
  const [addingStage, setAddingStage] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');

  const fetchPipelines = useCallback(async () => {
    try {
      const wsRes = await fetch('/api/workspaces');
      const workspaces = await wsRes.json();
      const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
      if (!ws) return;
      setWorkspaceId(ws.id);

      const res = await fetch(`/api/workspaces/${ws.id}/pipelines`);
      if (res.ok) {
        const list = await res.json();
        const detailed: PipelineRow[] = [];
        for (const p of list) {
          const dRes = await fetch(`/api/workspaces/${ws.id}/pipelines/${p.id}`);
          if (dRes.ok) detailed.push(await dRes.json());
        }
        setPipelines(detailed);
      }
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  async function createPipeline(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), type: newType, stages: [] }),
    });
    setNewName('');
    setShowCreate(false);
    fetchPipelines();
  }

  async function deletePipeline(id: string) {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/pipelines/${id}`, { method: 'DELETE' });
    fetchPipelines();
  }

  async function addStage(pipelineId: string) {
    if (!newStageName.trim() || !workspaceId) return;
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    const maxPos = pipeline ? Math.max(0, ...pipeline.stages.map((s) => s.position)) : 0;
    await fetch(`/api/workspaces/${workspaceId}/pipelines/${pipelineId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newStageName.trim(), color: newStageColor, position: maxPos + 1 }),
    });
    setNewStageName('');
    setNewStageColor('#6366f1');
    setAddingStage(null);
    fetchPipelines();
  }

  async function updateStage(pipelineId: string, stageId: string, data: { name: string; color: string }) {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/pipelines/${pipelineId}/stages?stageId=${stageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setEditingStage(null);
    fetchPipelines();
  }

  async function deleteStage(pipelineId: string, stageId: string) {
    if (!workspaceId) return;
    await fetch(`/api/workspaces/${workspaceId}/pipelines/${pipelineId}/stages?stageId=${stageId}`, { method: 'DELETE' });
    fetchPipelines();
  }

  if (loading) {
    return <div className="p-6"><p className="text-gray-500 dark:text-gray-400">Loading...</p></div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipelines</h1>
        <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Pipeline
        </button>
      </div>

      {showCreate && (
        <form className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" onSubmit={createPipeline}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Create Pipeline</h2>
            <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowCreate(false)} type="button"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 flex gap-3">
            <input autoFocus className="flex-1 rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setNewName(e.target.value)} placeholder="Pipeline name" required value={newName} />
            <select className="rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setNewType(e.target.value)} value={newType}>
              <option value="SALES">Sales</option>
              <option value="PRODUCTION">Production</option>
            </select>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" type="submit">Create</button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-6">
        {pipelines.map((pipeline) => (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" key={pipeline.id}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{pipeline.name}</h2>
                <p className="text-xs text-gray-400">{pipeline.type}</p>
              </div>
              <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400" onClick={() => deletePipeline(pipeline.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {[...pipeline.stages].sort((a, b) => a.position - b.position).map((stage) => (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800" key={stage.id}>
                    {editingStage?.stageId === stage.id ? (
                      <>
                        <input className="h-6 w-6 cursor-pointer rounded border-0" onChange={(e) => setEditingStage({ ...editingStage, color: e.target.value })} type="color" value={editingStage.color} />
                        <input className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })} value={editingStage.name} />
                        <button className="text-xs text-blue-600 hover:underline" onClick={() => updateStage(pipeline.id, stage.id, { name: editingStage.name, color: editingStage.color })}>Save</button>
                        <button className="text-xs text-gray-400" onClick={() => setEditingStage(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                        <span className="flex-1 text-sm text-gray-900 dark:text-white">{stage.name}</span>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setEditingStage({ pipelineId: pipeline.id, stageId: stage.id, name: stage.name, color: stage.color })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button className="text-gray-400 hover:text-red-600 dark:hover:text-red-400" onClick={() => deleteStage(pipeline.id, stage.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {addingStage === pipeline.id ? (
                <div className="mt-2 flex items-center gap-2">
                  <input className="h-6 w-6 cursor-pointer rounded border-0" onChange={(e) => setNewStageColor(e.target.value)} type="color" value={newStageColor} />
                  <input autoFocus className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" onChange={(e) => setNewStageName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addStage(pipeline.id); if (e.key === 'Escape') setAddingStage(null); }} placeholder="Stage name" value={newStageName} />
                  <button className="text-xs text-blue-600 hover:underline" onClick={() => addStage(pipeline.id)}>Add</button>
                  <button className="text-xs text-gray-400" onClick={() => setAddingStage(null)}>Cancel</button>
                </div>
              ) : (
                <button className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" onClick={() => setAddingStage(pipeline.id)}>
                  <Plus className="h-3 w-3" />
                  Add Stage
                </button>
              )}
            </div>
          </div>
        ))}

        {pipelines.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No pipelines configured. Create one to start tracking leads or production.</p>
          </div>
        )}
      </div>
    </div>
  );
}
