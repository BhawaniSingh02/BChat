import { useState } from 'react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useRoomStore } from '../../store/roomStore'

interface CreateRoomModalProps {
  open: boolean
  onClose: () => void
}

export default function CreateRoomModal({ open, onClose }: CreateRoomModalProps) {
  const [roomId, setRoomId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const createRoom = useRoomStore((s) => s.createRoom)
  const setActiveRoom = useRoomStore((s) => s.setActiveRoom)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (roomId.length < 3) {
      setError('Room ID must be at least 3 characters')
      return
    }
    setLoading(true)
    try {
      const room = await createRoom(roomId.toLowerCase().trim(), name.trim(), description.trim() || undefined)
      setActiveRoom(room.roomId)
      onClose()
      setRoomId('')
      setName('')
      setDescription('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Failed to create room'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Room">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="e.g. general, tech-talk"
          required
          minLength={3}
          maxLength={50}
          autoFocus
        />
        <p className="text-xs text-gray-500 -mt-2">
          Lowercase letters, numbers, and hyphens only
        </p>

        <Input
          label="Room Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. General"
          required
        />

        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this room about?"
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  )
}
