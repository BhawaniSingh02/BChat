import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'baaat.theme'

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* storage unavailable */ }
  // Default to Light for users who haven't picked a theme yet (they can still
  // choose "System default" to follow their OS).
  return 'light'
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** The concrete light/dark actually shown for a given preference. */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
}

/** Toggle the `dark` class on <html> to match the resolved theme. */
function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark')
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Apply the stored theme and start listening for OS changes (call once on app load). */
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readStoredTheme(),

  setTheme: (theme) => {
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* ignore */ }
    applyTheme(theme)
    set({ theme })
  },

  initTheme: () => {
    applyTheme(get().theme)
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      // When following the system, re-apply whenever the OS theme flips.
      mql.addEventListener?.('change', () => {
        if (get().theme === 'system') applyTheme('system')
      })
    }
  },
}))

// Apply the stored theme as early as possible (on module import) to reduce flash.
applyTheme(readStoredTheme())
