import { create } from 'zustand'

export interface NotificationToast {
  id: string
  /** Sender / room name shown in bold. */
  title: string
  /** Message preview line. */
  body: string
  /** Name used to render the Avatar (initials + colour). */
  avatarName: string
  avatarUrl?: string
  /** Navigation target when the toast is clicked. */
  conversationId?: string
  roomId?: string
}

/** How long a toast stays before auto-dismissing. */
export const TOAST_DURATION_MS = 5000
/** Maximum simultaneously-visible toasts. */
const MAX_TOASTS = 3

interface ToastState {
  toasts: NotificationToast[]
  showToast: (toast: Omit<NotificationToast, 'id'>) => void
  dismissToast: (id: string) => void
  clearToasts: () => void
}

let counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (toast) => {
    counter += 1
    const id = `toast-${counter}`
    set((s) => ({ toasts: [{ ...toast, id }, ...s.toasts].slice(0, MAX_TOASTS) }))
    // Auto-dismiss after the display duration.
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),
}))
