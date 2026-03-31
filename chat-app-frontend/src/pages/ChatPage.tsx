import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useRoomStore } from '../store/roomStore'
import { useDMStore } from '../store/dmStore'
import { usePresenceStore } from '../store/presenceStore'
import { useChatStore } from '../store/chatStore'
import { useWebSocket } from '../hooks/useWebSocket'
import Sidebar from '../components/layout/Sidebar'
import ChatView from '../components/chat/ChatView'
import DMChatView from '../components/chat/DMChatView'
import CreateRoomModal from '../components/rooms/CreateRoomModal'
import RoomSettingsModal from '../components/rooms/RoomSettingsModal'
import Modal from '../components/ui/Modal'
import RoomList from '../components/rooms/RoomList'
import QuickSwitcher from '../components/ui/QuickSwitcher'
import UserProfileModal from '../components/ui/UserProfileModal'

export default function ChatPage() {
  const { user, token } = useAuthStore()
  const {
    myRooms, rooms, activeRoomId, isLoading: roomsLoading,
    fetchMyRooms, fetchAllRooms, setActiveRoom, leaveRoom, joinRoom,
    kickMember, pinMessage, unpinMessage,
  } = useRoomStore()
  const { conversations, activeDMId, fetchConversations, setActiveDM, resetDMUnread } = useDMStore()
  const { fetchOnlineUsers } = usePresenceStore()
  const resetUnread = useChatStore((s) => s.resetUnread)
  const { subscribeToRoom, sendMessage, sendTyping, sendDM, editMessage, deleteMessage, reactToMessage, editDMMessage, deleteDMMessage, reactToDMMessage, connected } = useWebSocket(token)
  const [apiError, setApiError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<string | null>(null)
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false)
  // Mobile: show sidebar or chat panel
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true)

  useEffect(() => {
    const load = async () => {
      const results = await Promise.allSettled([
        fetchMyRooms(), fetchAllRooms(), fetchConversations(), fetchOnlineUsers(),
      ])
      if (results.some((r) => r.status === 'rejected')) {
        setApiError('Could not connect to server. Make sure the backend is running on port 8080.')
      }
    }
    load()
  }, [fetchMyRooms, fetchAllRooms, fetchConversations, fetchOnlineUsers])

  // Auto-select first room when rooms load and nothing is selected
  useEffect(() => {
    if (!activeRoomId && !activeDMId && myRooms.length > 0) {
      setActiveRoom(myRooms[0].roomId)
    }
  }, [myRooms, activeRoomId, activeDMId])

  // Reset unread badge when entering a room
  useEffect(() => {
    if (activeRoomId) resetUnread(activeRoomId)
  }, [activeRoomId])

  // Reset DM unread badge when entering a DM conversation
  useEffect(() => {
    if (activeDMId) resetDMUnread(activeDMId)
  }, [activeDMId])

  // Global Ctrl+K / Cmd+K handler for quick switcher
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setQuickSwitcherOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const activeRoom = myRooms.find((r) => r.roomId === activeRoomId)
    ?? rooms.find((r) => r.roomId === activeRoomId)
  const activeConversation = conversations.find((c) => c.id === activeDMId)

  const handleSendRoomMessage = (content: string, fileUrl?: string, messageType?: string) => {
    if (activeRoomId) sendMessage(activeRoomId, content, fileUrl, messageType)
  }
  const handleTyping = (typing: boolean) => {
    if (activeRoomId) sendTyping(activeRoomId, typing)
  }
  const handleSubscribeToRoom = () => {
    if (activeRoomId) subscribeToRoom(activeRoomId)
  }
  const handleLeaveRoom = async () => {
    if (activeRoomId) { await leaveRoom(activeRoomId); setActiveRoom(null); setMobileSidebarOpen(true) }
  }
  const handleSendDM = (content: string, fileUrl?: string, messageType?: string) => {
    if (activeDMId) sendDM(activeDMId, content, fileUrl, messageType)
  }
  const handleEditMessage = (messageId: string, newContent: string) => {
    if (activeRoomId) editMessage(activeRoomId, messageId, newContent)
  }
  const handleDeleteMessage = (messageId: string) => {
    if (activeRoomId) deleteMessage(activeRoomId, messageId)
  }
  const handleReactMessage = (messageId: string, emoji: string) => {
    if (activeRoomId) reactToMessage(activeRoomId, messageId, emoji)
  }
  const handleDMEditMessage = (messageId: string, newContent: string) => {
    if (activeDMId) editDMMessage(activeDMId, messageId, newContent)
  }
  const handleDMDeleteMessage = (messageId: string) => {
    if (activeDMId) deleteDMMessage(activeDMId, messageId)
  }
  const handleDMReactMessage = (messageId: string, emoji: string) => {
    if (activeDMId) reactToDMMessage(activeDMId, messageId, emoji)
  }
  const handleKickMember = async (username: string) => {
    if (activeRoomId) await kickMember(activeRoomId, username)
  }
  const handlePinMessage = async (messageId: string) => {
    if (activeRoomId) await pinMessage(activeRoomId, messageId)
  }
  const handleUnpinMessage = async (messageId: string) => {
    if (activeRoomId) await unpinMessage(activeRoomId, messageId)
  }
  const handleJoinRoom = async (roomId: string) => {
    await joinRoom(roomId)
    setActiveRoom(roomId)
    setDiscoverOpen(false)
  }

  const showRoom = activeRoom && user && !activeDMId
  const showDM = activeConversation && user && activeDMId

  const hasActiveChat = !!(showRoom || showDM)

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* Sidebar: always visible on md+, shown/hidden on mobile */}
      <div className={`
        ${mobileSidebarOpen ? 'flex' : 'hidden'}
        md:flex flex-shrink-0
        w-full md:w-80
        absolute md:relative inset-0 z-20 md:z-auto
      `}>
        <Sidebar onSelectChat={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Chat panel: always visible on md+, shown when chat selected on mobile */}
      <main className={`
        ${!mobileSidebarOpen || !hasActiveChat ? 'flex' : 'hidden'}
        md:flex flex-1 flex-col min-w-0
        w-full
      `}>
        {/* API Error Banner */}
        {apiError && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3" role="alert" aria-live="assertive">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-sm text-red-700 flex-1">{apiError}</p>
            <button
              onClick={() => setApiError(null)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* WebSocket connecting indicator */}
        {!connected && !apiError && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-xs text-amber-700">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse flex-shrink-0" />
            Connecting to server…
          </div>
        )}

        {showRoom ? (
          <ChatView
            room={activeRoom}
            currentUsername={user.username}
            onSendMessage={handleSendRoomMessage}
            onTyping={handleTyping}
            onSubscribe={handleSubscribeToRoom}
            onLeave={handleLeaveRoom}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onReactMessage={handleReactMessage}
            onViewProfile={setViewingUser}
            onBack={() => setMobileSidebarOpen(true)}
            onKickMember={handleKickMember}
            onOpenSettings={() => setRoomSettingsOpen(true)}
            onPinMessage={handlePinMessage}
            onUnpinMessage={handleUnpinMessage}
          />
        ) : showDM ? (
          <DMChatView
            conversation={activeConversation}
            currentUsername={user.username}
            onSend={handleSendDM}
            onViewProfile={setViewingUser}
            onEditMessage={handleDMEditMessage}
            onDeleteMessage={handleDMDeleteMessage}
            onReactMessage={handleDMReactMessage}
            onBack={() => setMobileSidebarOpen(true)}
          />
        ) : roomsLoading ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Loading your rooms…</p>
            </div>
          </div>
        ) : (
          /* Welcome / Empty state */
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-green-50/30 p-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-lg w-full text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <span className="text-white text-4xl">💬</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to BChat</h2>
              <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                Connect with others in chat rooms or through direct messages.
                {myRooms.length === 0 && ' Create your first room or browse existing ones to get started.'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCreateOpen(true)}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed border-green-200 hover:border-green-400 hover:bg-green-50 transition-all group"
                  data-testid="create-room-cta"
                >
                  <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center text-2xl transition-colors">
                    🏠
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">Create Room</div>
                    <div className="text-xs text-gray-400 mt-0.5">Start a group chat</div>
                  </div>
                </button>

                <button
                  onClick={() => setDiscoverOpen(true)}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  data-testid="browse-rooms-cta"
                >
                  <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center text-2xl transition-colors">
                    🔍
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">Browse Rooms</div>
                    <div className="text-xs text-gray-400 mt-0.5">Join existing rooms</div>
                  </div>
                </button>
              </div>

              {user && (
                <p className="text-xs text-gray-400 mt-6">
                  Signed in as <span className="font-medium text-gray-600">{user.username}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <Modal open={discoverOpen} onClose={() => setDiscoverOpen(false)} title="Browse Rooms">
        <div className="h-96 -mx-6 -mb-4 overflow-hidden rounded-b-xl">
          <RoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSelectRoom={(id) => { setActiveRoom(id); setDiscoverOpen(false) }}
            onJoinRoom={handleJoinRoom}
            showJoin
          />
        </div>
      </Modal>

      <QuickSwitcher
        open={quickSwitcherOpen}
        onClose={() => setQuickSwitcherOpen(false)}
        rooms={myRooms}
        conversations={conversations}
        currentUsername={user?.username ?? ''}
        onSelectRoom={(id) => { setActiveRoom(id); setActiveDM(null) }}
        onSelectDM={(id) => { setActiveDM(id); setActiveRoom(null) }}
        activeRoomId={activeRoomId}
        activeDMId={activeDMId}
      />

      <UserProfileModal username={viewingUser} onClose={() => setViewingUser(null)} />

      {activeRoom && (
        <RoomSettingsModal
          room={activeRoom}
          open={roomSettingsOpen}
          onClose={() => setRoomSettingsOpen(false)}
        />
      )}
    </div>
  )
}
