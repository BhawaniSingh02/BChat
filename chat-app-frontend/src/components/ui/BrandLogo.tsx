import type { CSSProperties } from 'react'

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg'
  tone?: 'light' | 'dark'
  stacked?: boolean
  showTagline?: boolean
  showIcon?: boolean
  interactive?: boolean
  className?: string
}

const sizeMap = {
  sm: {
    icon: 'h-9 w-9 rounded-xl',
    wordmark: 'text-[1.15rem]',
    tagline: 'text-[0.65rem]',
    gap: 'gap-2.5',
  },
  md: {
    icon: 'h-11 w-11 rounded-2xl',
    wordmark: 'text-[1.58rem]',
    tagline: 'text-[0.72rem]',
    gap: 'gap-3',
  },
  lg: {
    icon: 'h-16 w-16 rounded-[22px]',
    wordmark: 'text-[2.4rem]',
    tagline: 'text-[0.78rem]',
    gap: 'gap-4',
  },
} as const

const wordmarkStyle: CSSProperties = {
  fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
  fontWeight: 900,
  letterSpacing: '-0.03em',
}

const wordmarkLetters = ['B', 'a', 'a', 'a', 't'] as const

export default function BrandLogo({
  size = 'md',
  tone = 'dark',
  stacked = false,
  showTagline = false,
  showIcon = true,
  interactive = false,
  className = '',
}: BrandLogoProps) {
  const palette = tone === 'light'
    ? {
        text: 'text-white',
        subtext: 'text-white/68',
        bubble: 'from-white/26 via-white/16 to-white/8',
        shadow: 'shadow-[0_14px_32px_rgba(255,255,255,0.12)]',
        dot: 'bg-white',
        ring: 'border-white/20',
      }
    : {
        text: 'text-slate-900',
        subtext: 'text-slate-500',
        bubble: 'from-emerald-500 via-teal-500 to-cyan-600',
        shadow: 'shadow-[0_16px_40px_rgba(13,148,136,0.24)]',
        dot: 'bg-white',
        ring: 'border-slate-200/70',
      }

  const sizing = sizeMap[size]

  return (
    <div className={`flex ${stacked ? 'flex-col items-center text-center' : 'items-center'} ${sizing.gap} ${interactive ? 'group/logo' : ''} ${className}`}>
      {showIcon && (
        <div className={`relative flex ${sizing.icon} items-center justify-center bg-gradient-to-br ${palette.bubble} ${palette.shadow} border ${palette.ring} overflow-hidden transition duration-500 ease-out ${interactive ? 'md:group-hover/logo:-translate-y-1 md:group-hover/logo:rotate-3 md:group-hover/logo:scale-[1.06]' : ''}`}>
          <div className={`absolute inset-x-1.5 top-1.5 h-1/2 rounded-full bg-white/20 blur-md transition duration-500 ${interactive ? 'md:group-hover/logo:opacity-90 md:group-hover/logo:scale-110' : ''}`} />
          <div className={`absolute inset-0 rounded-[inherit] bg-white/0 transition duration-500 ${interactive ? 'md:group-hover/logo:bg-white/10' : ''}`} />
          <div className={`relative flex h-[72%] w-[72%] items-center justify-center rounded-[30%] bg-slate-950/12 backdrop-blur-sm transition duration-500 ${interactive ? 'md:group-hover/logo:scale-105 md:group-hover/logo:bg-slate-950/18' : ''}`}>
            <span
              className={`leading-none ${tone === 'light' ? 'text-white' : 'text-white'} transition duration-500 ${interactive ? 'md:group-hover/logo:-translate-y-[1px]' : ''}`}
              style={{
                fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
                fontWeight: 900,
                fontSize: size === 'lg' ? '1.85rem' : size === 'md' ? '1.35rem' : '1.05rem',
                letterSpacing: '-0.08em',
                transform: 'translateX(-0.02em)',
              }}
            >
              B
            </span>
          </div>
        </div>
      )}

      <div className={stacked ? 'space-y-1' : 'space-y-0.5'}>
        <div className={`relative leading-none ${palette.text}`}>
          <span
            className={`pointer-events-none absolute left-0 right-0 top-1/2 h-[0.72em] -translate-y-1/2 rounded-full blur-xl transition duration-700 ${
              tone === 'light' ? 'bg-white/0' : 'bg-cyan-300/0'
            } ${interactive ? (tone === 'light' ? 'md:group-hover/logo:bg-white/10' : 'md:group-hover/logo:bg-cyan-300/18') : ''}`}
          />
          <span
            style={wordmarkStyle}
            className={`${sizing.wordmark} relative inline-flex items-start overflow-hidden align-top`}
          >
            {wordmarkLetters.map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className="relative inline-block overflow-hidden"
                style={{
                  height: '1.08em',
                  width: letter === 'B' ? '0.72em' : '0.52em',
                  marginRight: index === wordmarkLetters.length - 1 ? '0' : '-0.04em',
                }}
              >
                <span
                  className={`absolute left-0 top-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    interactive ? 'md:group-hover/logo:-translate-y-[1.02em]' : ''
                  }`}
                  style={{ transitionDelay: interactive ? `${index * 55}ms` : undefined }}
                >
                  <span className={`${tone === 'light' ? 'text-white' : 'text-slate-900'}`}>
                    {letter}
                  </span>
                  <span className={`${tone === 'light' ? 'text-cyan-100' : 'text-teal-700'}`}>
                    {letter}
                  </span>
                </span>
              </span>
            ))}
          </span>
        </div>
        {showTagline && (
          <p className={`${sizing.tagline} uppercase tracking-[0.24em] ${palette.subtext} transition duration-500 ${interactive ? 'md:group-hover/logo:text-white/85' : ''}`}>
            Conversations, refined
          </p>
        )}
      </div>
    </div>
  )
}
