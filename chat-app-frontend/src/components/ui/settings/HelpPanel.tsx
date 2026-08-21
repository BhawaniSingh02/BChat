import BrandLogo from '../BrandLogo'

const APP_VERSION = '1.0'

export default function HelpPanel() {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Help</h3>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">About Baaat and where to get support.</p>

      <div className="mt-6 flex flex-col items-center rounded-xl border border-gray-100 bg-gray-50/60 px-6 py-8 text-center dark:border-gray-800 dark:bg-gray-800/40">
        <BrandLogo size="md" />
        <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Baaat</p>
        <p className="text-xs text-gray-400">Version {APP_VERSION}</p>
        <p className="mt-3 max-w-xs text-xs text-gray-500">
          A fast, private place to chat, call, and stay connected.
        </p>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Support</p>
        <p className="text-gray-600">
          Questions or feedback? Reach us at{' '}
          <a href="mailto:baaat.app@gmail.com" className="font-medium text-teal-700 hover:underline">baaat.app@gmail.com</a>.
        </p>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Legal</p>
        <a
          href="/privacy-policy"
          target="_blank"
          rel="noreferrer"
          className="inline-block font-medium text-teal-700 hover:underline"
        >
          Privacy Policy
        </a>
      </div>
    </div>
  )
}
