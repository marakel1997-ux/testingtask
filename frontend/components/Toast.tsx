'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type Toast = { id: number; message: string };

const ToastContext = createContext<{ push: (message: string) => void }>({ push: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      push: (message: string) => {
        const id = Date.now();
        setToasts((current) => [...current, { id, message }]);
        setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2600);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
