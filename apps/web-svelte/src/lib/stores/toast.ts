import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  timeout: number; // ms
};

const store = writable<Toast[]>([]);

function push(toast: Omit<Toast, 'id' | 'type' | 'timeout'> & Partial<Pick<Toast, 'id' | 'type' | 'timeout'>>) {
  const id = toast.id ?? crypto.randomUUID();
  const type: ToastType = toast.type ?? 'info';
  const timeout = toast.timeout ?? 3000;
  const item: Toast = { id, type, message: toast.message, timeout };
  store.update((list) => [...list, item]);
  if (timeout > 0) {
    setTimeout(() => dismiss(id), timeout);
  }
  return id;
}

function dismiss(id: string) {
  store.update((list) => list.filter((t) => t.id !== id));
}

export const toasts = {
  subscribe: store.subscribe,
  push,
  dismiss,
  success: (message: string, timeout = 2500) => push({ message, type: 'success', timeout }),
  error: (message: string, timeout = 4000) => push({ message, type: 'error', timeout }),
  info: (message: string, timeout = 3000) => push({ message, type: 'info', timeout }),
  warning: (message: string, timeout = 3500) => push({ message, type: 'warning', timeout })
};
