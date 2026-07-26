'use client';

import { useEffect, useRef } from 'react';

interface WorkspaceEvent {
  type: string;
  data: unknown;
}

export function useWorkspaceEvents(
  workspaceId: string | null,
  onEvent: (event: WorkspaceEvent) => void,
) {
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    const eventSource = new EventSource(`/api/workspaces/${workspaceId}/events`);

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as WorkspaceEvent;
        callbackRef.current(parsed);
      } catch {
        // ignore malformed events
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [workspaceId]);
}
