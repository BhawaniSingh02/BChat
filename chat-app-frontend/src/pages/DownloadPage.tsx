import { useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import BrandLogo from '../components/ui/BrandLogo'

// ─── Stable download URLs — redirect handled by /api/download ─────────────────
// To release a new version: update VERSION in api/download.js only.
const DOWNLOADS = {
  windows: {
    label: 'Windows',
    url: '/api/download?platform=win',
    size: '~85 MB',
    note: 'Windows 10 / 11',
  },
  mac: {
    label: 'macOS',
    url: '/api/download?platform=mac',
    size: '~90 MB',
    note: 'macOS 11+',
  },
  linux: {
    label: 'Linux',
    url: '/api/download?platform=linux',
    size: '~95 MB',
    note: 'AppImage · x64',
  },
}

type Platform = 'windows' | 'mac' | 'linux'

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac')) return 'mac'
  return 'linux'
}

const PlatformIcons: Record<Platform, ReactElement> = {
  windows: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  ),
  mac: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.701"/>
    </svg>
  ),
  linux: (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.123 1.verzögerung-.384 1.341-.993.13-.234.22-.336.35-.37.108-.03.239-.017.41.025.42.115.697.55.97.85.272.297.593.538.95.626.96.235 2.608-.064 3.946-.584.706-.268 1.406-.581 1.907-1.034.384-.349.583-.74.556-1.162l-.084-.01c.243-.385.48-.783.695-1.21.302-.602.541-1.178.787-1.506 1.345-1.689 1.951-5.059.758-6.979-.36-.588-.409-1.514-.429-2.33-.02-.812-.058-1.595-.291-2.365C15.947.67 14.415-.006 12.504 0zm.024 .994c1.609 0 2.563.565 2.985 1.317.321.569.381 1.227.401 2.134.022.893.075 1.953.523 2.683 1.002 1.622.47 4.499-.67 5.898-.354.443-.631 1.08-.907 1.662-.277.578-.53 1.168-.711 1.515-.351.67-.558.796-.698.854-.14.059-.24.061-.41.02-.17-.04-.424-.163-.74-.33-.66-.35-1.638-.667-2.633-.437-.624.145-1.152.507-1.37.985-.209.465-.237.988-.262 1.462-.05.953-.098 1.761-.596 2.085-.315.206-.734.285-1.278.335-.541.05-1.178.033-1.794-.03-.308-.032-.581-.086-.789-.155-.205-.07-.345-.153-.411-.267-.073-.127-.05-.356.13-.893.17-.51.137-.925.082-1.293a3.017 3.017 0 00-.038-.217 2.953 2.953 0 01-.021-.144c-.05-.419-.034-.766.04-1.062.148-.584.495-1.107.95-1.635.76-.868 1.753-1.866 2.09-3.3.184-.773.252-1.661.256-2.492l.004-.15c.056-1.135-.218-4.51 2.411-4.716.11-.009.219-.013.325-.013z"/>
    </svg>
  ),
}

export default function DownloadPage() {
  const [darkMode, setDarkMode] = useState(false)
  const detected = detectPlatform()

  return (
    <div className={`min-h-screen w-full overflow-x-hidden flex flex-col items-center justify-center p-6 transition-colors ${
      darkMode
        ? 'bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]'
        : 'bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(8,145,178,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]'
    }`}>

      {/* Dark mode toggle */}
      <button
        type="button"
        onClick={() => setDarkMode(v => !v)}
        className={`fixed right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
          darkMode
            ? 'border-white/10 bg-slate-900/70 text-slate-100 shadow-[0_12px_30px_rgba(2,6,23,0.35)] hover:bg-slate-800/80'
            : 'border-white/80 bg-white/88 text-slate-700 shadow-[0_12px_26px_rgba(15,23,42,0.10)] hover:bg-white'
        }`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="12" cy="12" r="4.2" />
            <path strokeLinecap="round" d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.72 5.28l-1.56 1.56M6.84 17.16l-1.56 1.56M18.72 18.72l-1.56-1.56M6.84 6.84L5.28 5.28" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.742 13.045a8.088 8.088 0 0 1-9.787-9.787 8.75 8.75 0 1 0 9.787 9.787Z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-3xl flex flex-col items-center gap-10">

        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandLogo size="lg" />
          <h1 className={`text-4xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Baaat for Desktop
          </h1>
          <p className={`text-base max-w-md ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Get the full Baaat experience with native notifications, system tray, and offline support.
          </p>
        </div>

        {/* Platform cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(DOWNLOADS) as [Platform, typeof DOWNLOADS.windows][]).map(([key, info]) => {
            const isRecommended = key === detected
            return (
              <div
                key={key}
                className={`relative flex flex-col items-center gap-4 rounded-2xl border p-6 transition-all ${
                  isRecommended
                    ? darkMode
                      ? 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                      : 'border-emerald-400/60 bg-emerald-50/80 shadow-[0_8px_30px_rgba(16,185,129,0.12)]'
                    : darkMode
                      ? 'border-white/10 bg-slate-900/50'
                      : 'border-white/70 bg-white/80'
                } backdrop-blur-xl`}
              >
                {isRecommended && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold ${
                    darkMode ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    Recommended
                  </span>
                )}

                <div className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                  {PlatformIcons[key]}
                </div>

                <div className="text-center">
                  <div className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {info.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {info.note}
                  </div>
                </div>

                <a
                  href={info.url}
                  download
                  className={`w-full text-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                    isRecommended
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg'
                      : darkMode
                        ? 'bg-slate-700 hover:bg-slate-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                  }`}
                >
                  Download · {info.size}
                </a>
              </div>
            )
          })}
        </div>

        {/* Features strip */}
        <div className={`w-full rounded-2xl border p-6 backdrop-blur-xl grid grid-cols-2 md:grid-cols-4 gap-4 ${
          darkMode ? 'border-white/10 bg-slate-900/50' : 'border-white/70 bg-white/80'
        }`}>
          {[
            { icon: '🔔', label: 'Native Notifications' },
            { icon: '📥', label: 'System Tray' },
            { icon: '⚡', label: 'Offline Support' },
            { icon: '🚀', label: 'Auto Launch' },
          ].map(f => (
            <div key={f.label} className="flex flex-col items-center gap-2 text-center">
              <span className="text-2xl">{f.icon}</span>
              <span className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className={`flex gap-6 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <Link to="/login" className="hover:underline">Sign in</Link>
          <Link to="/register" className="hover:underline">Create account</Link>
          <a
            href="https://github.com/YOUR_GITHUB_USER/YOUR_REPO/releases"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            All releases
          </a>
        </div>
      </div>
    </div>
  )
}
