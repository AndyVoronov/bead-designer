"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/* ── Types ────────────────────────────────────────────────────────────── */

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  toasts: Toast[];
  success: (msg: string, opts?: { action?: { label: string; onClick: () => void } }) => void;
  error: (msg: string, opts?: { action?: { label: string; onClick: () => void } }) => void;
  info: (msg: string, opts?: { action?: { label: string; onClick: () => void } }) => void;
}

/* ── Context ──────────────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  success: () => {},
  error: () => {},
  info: () => {},
});

let nextId = 0;

/* ── Provider ────────────────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, action?: { label: string; onClick: () => void }) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message, action }]);
    // Auto-remove after 5s (longer for action toasts)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const success = useCallback((msg: string, opts?: { action?: { label: string; onClick: () => void } }) => addToast("success", msg, opts?.action), [addToast]);
  const error = useCallback((msg: string, opts?: { action?: { label: string; onClick: () => void } }) => addToast("error", msg, opts?.action), [addToast]);
  const info = useCallback((msg: string, opts?: { action?: { label: string; onClick: () => void } }) => addToast("info", msg, opts?.action), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, success, error, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────────────────────── */

export function useToast() {
  return useContext(ToastContext);
}

/* ── Visual ──────────────────────────────────────────────────────────── */

const ICONS: Record<ToastType, string> = {
  success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  error: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

const COLORS: Record<ToastType, string> = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" role="status" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-slide-in ${COLORS[toast.type]}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <path d={ICONS[toast.type]} />
          </svg>
          <span className="flex-1">{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                removeToast(toast.id);
              }}
              className="text-xs font-bold underline underline-offset-2 hover:no-underline shrink-0 cursor-pointer whitespace-nowrap"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      ))}
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
