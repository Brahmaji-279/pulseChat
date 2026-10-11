import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// Module-level store to avoid prop drilling
let _setToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export function addToast(type: Toast['type'], message: string) {
  if (!_setToasts) return;
  const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  _setToasts((prev) => [...prev, { id, type, message }]);
  setTimeout(() => {
    _setToasts?.((prev) => prev.filter((t) => t.id !== id));
  }, 4500);
}

export const toast = {
  success: (msg: string) => addToast('success', msg),
  error: (msg: string) => addToast('error', msg),
  warning: (msg: string) => addToast('warning', msg),
  info: (msg: string) => addToast('info', msg),
};

const toastConfig = {
  success: {
    icon: CheckCircle,
    border: 'border-l-emerald-500',
    iconColor: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
  },
  error: {
    icon: XCircle,
    border: 'border-l-red-500',
    iconColor: 'text-red-400',
    bg: 'bg-red-500/5',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-l-amber-400',
    iconColor: 'text-amber-400',
    bg: 'bg-amber-500/5',
  },
  info: {
    icon: Info,
    border: 'border-l-blue-400',
    iconColor: 'text-blue-400',
    bg: 'bg-blue-500/5',
  },
};

export const ToastNotifications: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Register the setter
  _setToasts = setToasts;

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[500] flex flex-col gap-2 w-80 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toastConfig[toast.type];
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="pointer-events-auto"
            >
              <div
                className={`${config.bg} ${config.border} border border-white/[0.08] border-l-[3px] bg-[#141414]/95 backdrop-blur-xl rounded-xl shadow-2xl shadow-black/50 p-4 flex items-start gap-3`}
              >
                <Icon size={16} className={`${config.iconColor} mt-0.5 shrink-0`} />
                <p className="text-sm text-white/80 flex-1 leading-snug">{toast.message}</p>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="p-0.5 rounded-md text-white/30 hover:text-white/60 transition-colors shrink-0 -mt-0.5 -mr-0.5"
                >
                  <X size={13} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
