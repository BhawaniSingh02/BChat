import { useState, useEffect } from 'react'
import type { Room } from '../../types'
import { useRoomStore } from '../../store/roomStore'

interface RoomSettingsModalProps {
  room: Room
  open: boolean
  onClose: () => void
}

export default function RoomSettingsModal({ room, open, onClose }: RoomSettingsModalProps) {
  const updateRoom = useRoomStore((s) => s.updateRoom)
  const [name, setName] = useState(room.name)
  const [description, setDescription] = useState(room.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setName(room.name)
      setDescription(room.description ?? '')
      setError(null)
      setSuccess(false)
    }
  }, [open, room.name, room.description])

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) { setError('Room name is required'); return }
    setSaving(true)
    setError(null)
    try {
      await updateRoom(room.roomId, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 1200)
    } catch {
      setError('Failed to update room settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" data-testid="room-settings-modal">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#075e54] flex items-center justify-between">
          <h2 className="text-white font-semibold text-base">Room Settings</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/20 hover:bg-white/30 rounded-lg p-1.5 transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Room Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              data-testid="room-name-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this room about?"
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              data-testid="room-description-input"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{description.length}/500</p>
          </div>

          {error && <p className="text-xs text-red-500" data-testid="room-settings-error">{error}</p>}
          {success && <p className="text-xs text-emerald-600 font-medium" data-testid="room-settings-success">✓ Room updated</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-sm font-medium bg-[#075e54] hover:bg-[#128c7e] text-white rounded-lg disabled:opacity-60 transition-colors"
              data-testid="save-room-settings-btn"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
