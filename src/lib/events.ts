type EventCallback = (data: string) => void;

class EventEmitter {
  private listeners = new Map<string, Set<EventCallback>>();

  subscribe(channel: string, callback: EventCallback) {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    return () => {
      this.listeners.get(channel)?.delete(callback);
      if (this.listeners.get(channel)?.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  emit(channel: string, data: unknown) {
    const callbacks = this.listeners.get(channel);
    if (callbacks) {
      const json = JSON.stringify(data);
      callbacks.forEach((cb) => cb(json));
    }
  }
}

const globalForEvents = globalThis as unknown as {
  eventEmitter: EventEmitter | undefined;
};

export const eventEmitter = globalForEvents.eventEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.eventEmitter = eventEmitter;
}
