'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let toastIdCounter = 0;
const toastListeners: Set<(toast: Toast) => void> = new Set();

export function showToast(type: ToastType, message: string) {
  const toast: Toast = {
    id: `toast-${++toastIdCounter}`,
    type,
    message,
  };
  toastListeners.forEach(listener => listener(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 5000);
    };

    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed bottom-0 right-0 z-[9999] p-4 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast pointer-events-auto flex items-center gap-3 min-w-[300px] max-w-md ${
            toast.type === 'success' ? 'toast-success' :
            toast.type === 'error' ? 'toast-error' :
            ''
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-cyan-400 flex-shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
          
          <p className="flex-1 text-sm text-foreground">{toast.message}</p>
          
          <button
            onClick={() => removeToast(toast.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
