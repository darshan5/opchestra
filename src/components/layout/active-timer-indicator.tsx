'use client';

import { Clock } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface ActiveTimerInfo {
  id: string;
  startedAt: string;
  pausedAt: string | null;
  totalPaused: number;
  task: { id: string; title: string };
}

export function ActiveTimerIndicator({ workspaceId }: { workspaceId: string }) {
  const [timer, setTimer] = useState<ActiveTimerInfo | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const fetchTimer = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/active-timer`);
      if (res.ok) {
        const data = await res.json();
        setTimer(data);
      }
    } catch {
      // ignore
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTimer();
    const interval = setInterval(fetchTimer, 30000);
    const handler = () => fetchTimer();
    window.addEventListener('timer-stopped', handler);
    window.addEventListener('timer-started', handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('timer-stopped', handler);
      window.removeEventListener('timer-started', handler);
    };
  }, [fetchTimer]);

  useEffect(() => {
    if (!timer || timer.pausedAt) {
      return;
    }
    const tick = setInterval(() => {
      const startMs = new Date(timer.startedAt).getTime();
      const pausedMs = timer.totalPaused * 1000;
      setElapsed(Math.floor((Date.now() - startMs - pausedMs) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [timer]);

  if (!timer) {
    return null;
  }

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const display = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div
      className="flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
      title={`Timer running on: ${timer.task.title}`}
    >
      <Clock className="h-3.5 w-3.5 animate-pulse" />
      <span className="font-mono">{display}</span>
      <span className="max-w-[120px] truncate">{timer.task.title}</span>
      {timer.pausedAt && (
        <span className="rounded bg-yellow-100 px-1 text-[10px] text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
          paused
        </span>
      )}
    </div>
  );
}
