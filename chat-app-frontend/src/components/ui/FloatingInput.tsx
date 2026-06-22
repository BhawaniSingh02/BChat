import { useState, type InputHTMLAttributes } from 'react'

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Use the auth pages' local dark palette (they don't use the global `.dark`). */
  darkMode?: boolean
}

/**
 * Instagram-style floating-label input: the label rests inside the empty field
 * and floats up small on focus or when filled. Includes a password reveal toggle.
 * Class strings are written as full literals so Tailwind's scanner keeps them.
 */
export default function FloatingInput({
  label, id, type = 'text', darkMode = false, className = '', value, ...props
}: FloatingInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)
  const effectiveType = isPassword && revealed ? 'text' : type
  // Only offer the reveal toggle once the user has typed something.
  const showReveal = isPassword && value != null && String(value).length > 0

  const fieldCls = darkMode
    ? 'border-slate-700 bg-slate-900/60 text-slate-100'
    : 'border-slate-300 bg-white text-slate-900'

  const labelCls = darkMode
    ? 'top-2 text-[11px] text-teal-400 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-teal-400'
    : 'top-2 text-[11px] text-teal-600 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-teal-600'

  const eyeCls = darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'

  return (
    <div className="relative">
      <input
        id={inputId}
        type={effectiveType}
        value={value}
        placeholder=" "
        className={`peer h-14 w-full rounded-xl border px-3.5 pt-5 pb-1.5 ${showReveal ? 'pr-11' : ''} text-sm outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/25 ${fieldCls} ${className}`}
        {...props}
      />
      <label
        htmlFor={inputId}
        className={`pointer-events-none absolute left-3.5 origin-left px-0.5 transition-all duration-150 ${labelCls}`}
      >
        {label}
      </label>
      {showReveal && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className={`absolute inset-y-0 right-0 flex items-center pr-3.5 transition-colors ${eyeCls}`}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          data-testid="password-toggle"
          tabIndex={-1}
        >
          {revealed ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      )}
    </div>
  )
}
