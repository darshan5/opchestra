'use client';

import { useEffect, useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
const listeners = new Set<(msg: ToastMessage) => void>();

export function toast(text: string, type: 'success' | 'error' | 'info' = 'success') {
  const msg: ToastMessage = { id: ++toastId, text, type };
  listeners.forEach((fn) => fn(msg));
}

const COLORS = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 3000);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          className={`animate-in slide-in-from-right rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg ${COLORS[t.type]}`}
          key={t.id}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
