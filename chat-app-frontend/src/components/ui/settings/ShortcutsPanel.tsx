interface Shortcut {
  keys: string[]
  action: string
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Esc'], action: 'Close the current dialog or panel' },
  { keys: ['Enter'], action: 'Send the message you’re typing' },
  { keys: ['Shift', 'Enter'], action: 'Add a new line without sending' },
  { keys: ['Ctrl', 'K'], action: 'Start a new direct message' },
  { keys: ['Ctrl', 'F'], action: 'Search within the current chat' },
]

export default function ShortcutsPanel() {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Speed up the things you do most.</p>

      <ul className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
        {SHORTCUTS.map((s) => (
          <li key={s.action} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">{s.action}</span>
            <span className="flex flex-shrink-0 items-center gap-1">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
