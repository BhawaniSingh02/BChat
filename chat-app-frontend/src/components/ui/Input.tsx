import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  labelClassName?: string
}

export default function Input({ label, error, className = '', labelClassName = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className={`text-sm font-medium text-gray-700 ${labelClassName}`}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-3 py-2 border rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
          ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
