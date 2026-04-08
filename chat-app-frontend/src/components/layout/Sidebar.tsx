import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useRoomStore } from '../../store/roomStore'
import { useDMStore } from '../../store/dmStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useChatStore } from '../../store/chatStore'
import { useNotificationStore } from '../../store/notificationStore'
import Avatar from '../ui/Avatar'
import RoomList from '../rooms/RoomList'
import Modal from '../ui/Modal'
import DMConversationCard from '../chat/DMConversationCard'
import UserSearchModal from '../ui/UserSearchModal'
import ProfileModal from '../ui/ProfileModal'
import NotificationBell from '../ui/NotificationBell'
import BrandLogo from '../ui/BrandLogo'


type Tab = 'rooms' | 'dms'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

function RoomSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  )
}

interface SidebarProps {
  onSelectChat?: () => void
  onGlobalSearchNavigate?: (message: import('../../types').Message) => void
}

export default function Sidebar({ onSelectChat, onGlobalSearchNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const { myRooms, activeRoomId, setActiveRoom, joinRoom, rooms, isLoading } = useRoomStore()
  const { conversations, activeDMId, setActiveDM, getOrCreateConversation } = useDMStore()
  const dmUnreadCounts = useDMStore((s) => s.dmUnreadCounts)
  const isOnline = usePresenceStore((s) => s.isOnline)
  const unreadCounts = useChatStore((s) => s.unreadCounts)
  const { notifications, markAllRead, markRead } = useNotificationStore()
  const [tab, setTab] = useState<Tab>('dms')
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [dmSearchOpen, setDMSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)


  const handleJoinRoom = async (roomId: string) => {
    await joinRoom(roomId)
    setActiveRoom(roomId)
    setDiscoverOpen(false)
  }

  const handleSelectRoom = (roomId: string) => {
    setActiveRoom(roomId)
    setActiveDM(null)
    onSelectChat?.()
  }

  const handleSelectDM = (id: string) => {
    setActiveDM(id)
    setActiveRoom(null)
    onSelectChat?.()
  }

  const handleStartDM = async (username: string) => {
    const conv = await getOrCreateConversation(username)
    setActiveDM(conv.id)
    setActiveRoom(null)
    setTab('dms')
    onSelectChat?.()
  }

  const totalDMUnread = Object.values(dmUnreadCounts).reduce((a, b) => a + b, 0)

  const sortedConversations = [...conversations].sort((a, b) => {
    if (!a.lastMessageAt && !b.lastMessageAt) return 0
    if (!a.lastMessageAt) return 1
    if (!b.lastMessageAt) return -1
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  })

  return (
    <div className="w-full md:w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="h-[58px] px-4 border-b border-slate-800/60 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 flex items-center justify-between shadow-[0_12px_30px_rgba(15,23,42,0.34)]">
        <div className="flex items-center gap-2">
          <BrandLogo size="md" tone="light" showIcon={false} interactive className="origin-left scale-x-[1.06]" />
        </div>
        <div className="flex items-center gap-1">
          {/* Global search button — Phase 25 */}
         
          {/* Notification bell — Phase 26 */}
          <NotificationBell
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onClickNotification={(n) => {
              markRead(n.id)
              onGlobalSearchNavigate?.(n.message)
            }}
          />

          <button
            onClick={() => tab === 'rooms' ? setDiscoverOpen(true) : setDMSearchOpen(true)}
            className="text-white/75 hover:text-white hover:bg-white/12 p-1.5 rounded-lg transition-colors text-sm"
            title={tab === 'rooms' ? 'Discover rooms' : 'New direct message'}
            aria-label={tab === 'rooms' ? 'Discover rooms' : 'New direct message'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={logout}
            className="text-white/75 hover:text-white hover:bg-white/12 p-1.5 rounded-lg transition-colors text-sm"
            title="Logout"
            aria-label="Logout"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
            tab === 'dms'
              ? 'text-teal-700 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setTab('dms')}
        >
          Messages {totalDMUnread > 0 && `(${totalDMUnread})`}
          {tab === 'dms' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-600" />
          )}
        </button>
        <button
          className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
            tab === 'rooms'
              ? 'text-teal-700 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setTab('rooms')}
        >
          Rooms
          {tab === 'rooms' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'rooms' ? (
          isLoading ? (
            <div className="py-2">
              {Array.from({ length: 5 }).map((_, i) => <RoomSkeleton key={i} />)}
            </div>
          ) : (
            <RoomList
              rooms={myRooms}
              activeRoomId={activeRoomId}
              onSelectRoom={handleSelectRoom}
              unreadCounts={unreadCounts}
            />
          )
        ) : (
          <div className="flex flex-col h-full">
            {sortedConversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-2xl">
                  💬
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">No conversations yet.</p>
                <button
                  onClick={() => setDMSearchOpen(true)}
                  className="mt-2 text-teal-700 hover:text-cyan-700 font-medium text-sm transition-colors"
                >
                  Start a new message
                </button>
              </div>
            ) : (
              <>
                {sortedConversations.map((conv) => (
                  <DMConversationCard
                    key={conv.id}
                    conversation={conv}
                    currentUsername={user?.username ?? ''}
                    active={conv.id === activeDMId}
                    online={isOnline(
                      conv.participants.find((p) => p !== user?.username) ?? ''
                    )}
                    unreadCount={dmUnreadCounts[conv.id]}
                    onClick={() => handleSelectDM(conv.id)}
                  />
                ))}
                <div className="p-4 border-t mt-auto">
                  <button
                    className="w-full rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setDMSearchOpen(true)}
                  >
                    + New Message
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Discover rooms modal */}
      <Modal open={discoverOpen} onClose={() => setDiscoverOpen(false)} title="Discover Rooms">
        <div className="h-96 -mx-6 -mb-4 overflow-hidden rounded-b-xl">
          <RoomList
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSelectRoom={(id) => { handleSelectRoom(id); setDiscoverOpen(false) }}
            onJoinRoom={handleJoinRoom}
            showJoin
          />
        </div>
      </Modal>

      {/* DM user search */}
      <UserSearchModal
        open={dmSearchOpen}
        onClose={() => setDMSearchOpen(false)}
        onSelectUser={handleStartDM}
        currentUsername={user?.username ?? ''}
      />

      {/* Profile footer */}
      {user && (
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
            data-testid="profile-footer-btn"
            aria-label="Open profile"
          >
            <Avatar name={user.username} size="sm" online src={user.avatarUrl ?? undefined} />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.displayName || user.username}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

     
    </div>
  )
}
