import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useRoomStore } from '../../store/roomStore'
import { useDMStore } from '../../store/dmStore'
import { usePresenceStore } from '../../store/presenceStore'
import { useChatStore } from '../../store/chatStore'
import { useUserCacheStore } from '../../store/userCacheStore'
import { messagesApi } from '../../api/messages'
import Avatar from '../ui/Avatar'
import RoomList from '../rooms/RoomList'
import Modal from '../ui/Modal'
import DMConversationCard from '../chat/DMConversationCard'
import CallLogList from '../call/CallLogList'
import StoriesBar from '../story/StoriesBar'
import UserSearchModal from '../ui/UserSearchModal'
import SettingsModal from '../ui/SettingsModal'
import BrandLogo from '../ui/BrandLogo'
import MessageRequestsModal from '../chat/MessageRequestsModal'
import { isConversationArchived } from '../../utils/conversation'
import type { CallType } from '../../types'


type Tab = 'rooms' | 'dms' | 'calls'

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
  onStartCall?: (conversationId: string, otherUsername: string, type: CallType) => void
}

export default function Sidebar({ onSelectChat, onStartCall }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const { myRooms, activeRoomId, setActiveRoom, joinRoom, rooms, isLoading } = useRoomStore()
  const { conversations, activeDMId, setActiveDM, getOrCreateConversation, removeConversation, updateConversation } = useDMStore()
  const requests = useDMStore((s) => s.requests)
  const dmUnreadCounts = useDMStore((s) => s.dmUnreadCounts)
  const isOnline = usePresenceStore((s) => s.isOnline)
  const unreadCounts = useChatStore((s) => s.unreadCounts)
  const userCache = useUserCacheStore((s) => s.cache)
  const prefetchUsers = useUserCacheStore((s) => s.prefetch)
  const [tab, setTab] = useState<Tab>('dms')
  const [dmFilter, setDmFilter] = useState<'all' | 'unread'>('all')
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [dmSearchOpen, setDMSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [requestsOpen, setRequestsOpen] = useState(false)
  // Local pin state — pinned conversation IDs float to top of the list
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())


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

  const handlePinConversation = (conversationId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(conversationId)) next.delete(conversationId)
      else next.add(conversationId)
      return next
    })
  }

  const handleDeleteConversation = async (conversationId: string) => {
    // Archive on the backend (hides the conversation) then remove locally.
    try {
      await messagesApi.archiveDM(conversationId)
    } catch { /* ignore if endpoint fails — still remove locally */ }
    removeConversation(conversationId)
  }

  // Hide conversations the user has archived from the main list…
  const visibleConversations = conversations.filter(
    (c) => !isConversationArchived(c, user?.username),
  )
  // …and surface them via a dedicated "Archived" entry instead.
  const archivedConversations = conversations.filter(
    (c) => isConversationArchived(c, user?.username),
  )

  const handleUnarchiveChat = async (conversationId: string) => {
    try {
      const updated = await messagesApi.unarchiveDM(conversationId)
      updateConversation(updated)
    } catch { /* ignore — stays archived if it fails */ }
  }

  const handleOpenArchivedChat = (conversationId: string) => {
    setActiveDM(conversationId)
    setActiveRoom(null)
    setArchivedOpen(false)
    onSelectChat?.()
  }

  // Resolve a participant's display name/@handle (never the opaque id).
  const resolveDisplayName = (username: string) => {
    const u = userCache[username]
    return u?.displayName || (u?.uniqueHandle ? `@${u.uniqueHandle}` : '…')
  }

  // Load archived participants' profiles when the modal opens.
  useEffect(() => {
    if (!archivedOpen) return
    const others = archivedConversations
      .map((c) => c.participants.find((p) => p !== user?.username))
      .filter((u): u is string => !!u)
    if (others.length) prefetchUsers(others)
  }, [archivedOpen, archivedConversations, user?.username, prefetchUsers])

  // Pinned conversations float to the top; within each group sort by lastMessageAt desc
  const sortedConversations = [...visibleConversations].sort((a, b) => {
    const aPinned = pinnedIds.has(a.id) ? 0 : 1
    const bPinned = pinnedIds.has(b.id) ? 0 : 1
    if (aPinned !== bPinned) return aPinned - bPinned
    if (!a.lastMessageAt && !b.lastMessageAt) return 0
    if (!a.lastMessageAt) return 1
    if (!b.lastMessageAt) return -1
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  })

  // Apply the active filter chip (All / Unread)
  const filteredConversations = dmFilter === 'unread'
    ? sortedConversations.filter((c) => (dmUnreadCounts[c.id] ?? 0) > 0)
    : sortedConversations

  return (
    <div className="w-full md:w-80 flex-shrink-0 bg-white dark:bg-[#111b21] border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="h-[58px] px-4 border-b border-slate-800/60 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 flex items-center justify-between shadow-[0_12px_30px_rgba(15,23,42,0.34)]">
        <div className="flex items-center gap-2">
          <BrandLogo size="md" tone="light" showIcon={false} interactive className="origin-left scale-x-[1.06]" />
        </div>
        <div className="flex items-center gap-1">
          {/* Global search button — Phase 25 */}
         
          {/* Notification bell — Phase 26 */}
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
            onClick={() => setConfirmLogoutOpen(true)}
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
      <div className="flex border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#0b141a]">
        <button
          className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
            tab === 'dms'
              ? 'text-teal-700 dark:text-teal-400 bg-white dark:bg-[#111b21]'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'
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
              ? 'text-teal-700 dark:text-teal-400 bg-white dark:bg-[#111b21]'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'
          }`}
          onClick={() => setTab('rooms')}
        >
          Rooms
          {tab === 'rooms' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-cyan-600" />
          )}
        </button>
        <button
          className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
            tab === 'calls'
              ? 'text-teal-700 dark:text-teal-400 bg-white dark:bg-[#111b21]'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/50'
          }`}
          onClick={() => setTab('calls')}
          data-testid="calls-tab"
        >
          Calls
          {tab === 'calls' && (
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
        ) : tab === 'calls' ? (
          <CallLogList
            currentUsername={user?.username ?? ''}
            onStartCall={(conversationId, otherUsername, type) => {
              onStartCall?.(conversationId, otherUsername, type)
              onSelectChat?.()
            }}
            onOpenConversation={handleSelectDM}
          />
        ) : (
          <div className="flex flex-col h-full">
            {/* Stories bar (WhatsApp/Insta-style status) */}
            <StoriesBar currentUsername={user?.username ?? ''} />
            {/* Filter chips (WhatsApp-style) — only when there are conversations */}
            {sortedConversations.length > 0 && (
              <div className="flex gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                {(['all', 'unread'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setDmFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      dmFilter === f
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    data-testid={`dm-filter-${f}`}
                  >
                    {f === 'all' ? 'All' : `Unread${totalDMUnread > 0 ? ` ${totalDMUnread}` : ''}`}
                  </button>
                ))}
              </div>
            )}
            {/* Message requests entry (Instagram-style) — only when some exist */}
            {requests.length > 0 && (
              <button
                onClick={() => setRequestsOpen(true)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left dark:border-gray-800 dark:hover:bg-gray-800/50"
                data-testid="requests-row"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white text-sm">
                  ✉
                </span>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Message requests</span>
                  <span className="block text-xs text-gray-400">
                    {requests.length} pending
                  </span>
                </div>
                <span className="flex-shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-teal-600 text-white text-xs font-semibold flex items-center justify-center">
                  {requests.length}
                </span>
              </button>
            )}
            {/* Archived chats entry (WhatsApp-style) — only when some exist */}
            {archivedConversations.length > 0 && (
              <button
                onClick={() => setArchivedOpen(true)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left dark:border-gray-800 dark:hover:bg-gray-800/50"
                data-testid="archived-row"
              >
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Archived</span>
                <span className="text-xs text-gray-400">{archivedConversations.length}</span>
              </button>
            )}
            {sortedConversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 text-2xl">
                  💬
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No conversations yet.</p>
                <button
                  onClick={() => setDMSearchOpen(true)}
                  className="mt-2 text-teal-700 hover:text-cyan-700 font-medium text-sm transition-colors"
                >
                  Start a new message
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center" data-testid="no-unread-empty">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 text-2xl">
                  ✅
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">You're all caught up</p>
                <button
                  onClick={() => setDmFilter('all')}
                  className="mt-2 text-teal-700 hover:text-cyan-700 font-medium text-sm transition-colors"
                >
                  Show all chats
                </button>
              </div>
            ) : (
              <>
                {filteredConversations.map((conv) => (
                  <DMConversationCard
                    key={conv.id}
                    conversation={conv}
                    currentUsername={user?.username ?? ''}
                    active={conv.id === activeDMId}
                    online={isOnline(
                      conv.participants.find((p) => p !== user?.username) ?? ''
                    )}
                    unreadCount={dmUnreadCounts[conv.id]}
                    isPinned={pinnedIds.has(conv.id)}
                    onClick={() => handleSelectDM(conv.id)}
                    onPin={handlePinConversation}
                    onDelete={handleDeleteConversation}
                  />
                ))}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
                  <button
                    className="w-full rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
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
        <div className="border-t border-gray-200 dark:border-gray-800 p-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group"
            data-testid="profile-footer-btn"
            aria-label="Open settings"
          >
            <Avatar name={user.displayName || user.uniqueHandle || user.username} size="sm" online src={user.avatarUrl ?? undefined} />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user.displayName || (user.uniqueHandle ? `@${user.uniqueHandle}` : user.username)}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user.uniqueHandle ? `@${user.uniqueHandle}` : user.email}
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* Settings hub */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLogout={() => { setSettingsOpen(false); logout() }}
      />

      {/* Message requests */}
      <MessageRequestsModal
        open={requestsOpen}
        onClose={() => setRequestsOpen(false)}
        currentUsername={user?.username ?? ''}
        onOpenConversation={handleSelectDM}
      />

      {/* Archived chats */}
      <Modal open={archivedOpen} onClose={() => setArchivedOpen(false)} title="Archived chats">
        {archivedConversations.length === 0 ? (
          <p className="text-sm text-gray-500">No archived chats.</p>
        ) : (
          <div className="-mx-2 max-h-80 overflow-y-auto">
            {archivedConversations.map((conv) => {
              const other = conv.participants.find((p) => p !== user?.username) ?? ''
              const otherName = resolveDisplayName(other)
              return (
                <div
                  key={conv.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  data-testid="archived-chat-item"
                >
                  <button
                    onClick={() => handleOpenArchivedChat(conv.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar name={otherName} size="sm" online={isOnline(other)} src={userCache[other]?.avatarUrl ?? undefined} />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{otherName}</span>
                  </button>
                  <button
                    onClick={() => handleUnarchiveChat(conv.id)}
                    className="text-xs text-teal-700 font-medium hover:underline flex-shrink-0"
                    data-testid="unarchive-chat-btn"
                  >
                    Unarchive
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Logout confirmation */}
      <Modal open={confirmLogoutOpen} onClose={() => setConfirmLogoutOpen(false)} title="Log out">
        <p className="text-sm text-gray-600">Are you sure you want to log out?</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={() => setConfirmLogoutOpen(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            data-testid="cancel-logout-btn"
          >
            Cancel
          </button>
          <button
            onClick={() => { setConfirmLogoutOpen(false); logout() }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
            data-testid="confirm-logout-btn"
          >
            Log out
          </button>
        </div>
      </Modal>
    </div>
  )
}
