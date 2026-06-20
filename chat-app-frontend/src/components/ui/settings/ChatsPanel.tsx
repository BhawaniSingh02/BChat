import { useThemeStore, type Theme } from '../../../store/themeStore'

const OPTIONS: { value: Theme; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Always use the light theme' },
  { value: 'dark', label: 'Dark', hint: 'Always use the dark theme' },
  { value: 'system', label: 'System default', hint: 'Match your device setting' },
]

export default function ChatsPanel() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Chats</h3>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Customize how Baaat looks.</p>

      <h4 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Theme</h4>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700" role="radiogroup" aria-label="Theme">
        {OPTIONS.map((opt) => {
          const active = theme === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              role="radio"
              aria-checked={active}
              className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
              data-testid={`theme-option-${opt.value}`}
            >
              <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                active ? 'border-teal-600' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {active && <span className="h-2.5 w-2.5 rounded-full bg-teal-600" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</span>
                <span className="block text-xs text-gray-400">{opt.hint}</span>
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-xs text-gray-400">More chat settings — wallpaper, media quality — are coming soon.</p>
    </div>
  )
}
