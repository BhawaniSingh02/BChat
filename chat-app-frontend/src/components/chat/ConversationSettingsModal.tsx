import { useState } from 'react'
import type { DirectConversation, DisappearingTimer } from '../../types'
import { messagesApi } from '../../api/messages'

interface ConversationSettingsModalProps {
  conversation: DirectConversation
  currentUsername: string
  otherUsername: string
  onClose: () => void
  onUpdated: (updated: DirectConversation) => void
  onBlock?: (username: string) => void
  onUnblock?: (username: string) => void
  isBlocked?: boolean
}

const DISAPPEARING_OPTIONS: { value: DisappearingTimer; label: string }[] = [
  { value: 'OFF', label: 'Off' },
  { value: '24H', label: '24 hours' },
  { value: '7D', label: '7 days' },
  { value: '90D', label: '90 days' },
]

const MUTE_OPTIONS = [
  { value: '8H', label: '8 hours' },
  { value: '1W', label: '1 week' },
  { value: 'ALWAYS', label: 'Always' },
]

export default function ConversationSettingsModal({
  conversation,
  currentUsername,
  otherUsername,
  onClose,
  onUpdated,
  onBlock,
  onUnblock,
  isBlocked = false,
}: ConversationSettingsModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMuted = !!conversation.mutedBy?.[currentUsername]
  const disappearing = conversation.disappearingMessagesTimer ?? 'OFF'

  const handleMute = async (duration: string) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await messagesApi.muteDM(conversation.id, duration)
      onUpdated(updated)
    } catch {
      setError('Failed to mute conversation')
    } finally {
      setSaving(false)
    }
  }

  const handleUnmute = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await messagesApi.unmuteDM(conversation.id)
      onUpdated(updated)
    } catch {
      setError('Failed to unmute conversation')
    } finally {
      setSaving(false)
    }
  }

  const handleDisappearing = async (timer: DisappearingTimer) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await messagesApi.setDisappearingTimer(conversation.id, timer)
      onUpdated(updated)
    } catch {
      setError('Failed to update disappearing timer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" data-testid="conversation-settings-modal">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Conversation Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-5">
          {error && <p className="text-sm text-red-500" data-testid="settings-error">{error}</p>}

          {/* ── Mute ── */}
          <section>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notifications</h4>
            {isMuted ? (
              <button
                onClick={handleUnmute}
                disabled={saving}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
                data-testid="unmute-btn"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                Muted — tap to unmute
              </button>
            ) : (
              <div className="flex gap-2">
                {MUTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleMute(opt.value)}
                    disabled={saving}
                    className="flex-1 text-xs px-2 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 text-gray-700"
                    data-testid={`mute-${opt.value}-btn`}
                  >
                    Mute {opt.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Disappearing messages ── */}
          <section>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Disappearing Messages</h4>
            <p className="text-xs text-gray-400 mb-2">New messages will auto-delete after:</p>
            <div className="grid grid-cols-2 gap-2">
              {DISAPPEARING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleDisappearing(opt.value)}
                  disabled={saving || disappearing === opt.value}
                  className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 ${
                    disappearing === opt.value
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                  data-testid={`disappearing-${opt.value}-btn`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Block / Unblock ── */}
          {(onBlock || onUnblock) && (
            <section>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Privacy</h4>
              {isBlocked ? (
                <button
                  onClick={() => { onUnblock?.(otherUsername); onClose() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
                  data-testid="unblock-user-btn"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Unblock {otherUsername}
                </button>
              ) : (
                <button
                  onClick={() => { onBlock?.(otherUsername); onClose() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                  data-testid="block-user-btn"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Block {otherUsername}
                </button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
