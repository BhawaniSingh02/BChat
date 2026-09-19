import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AlertButton,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import FilePreviewModal from '../components/FilePreviewModal';
import ForwardMessageModal from '../components/ForwardMessageModal';
import ImageViewerModal from '../components/ImageViewerModal';
import MessageActionSheet from '../components/MessageActionSheet';
import MessageRow from '../components/MessageRow';
import VideoPlayerModal from '../components/VideoPlayerModal';
import VoiceRecorder, { formatDuration } from '../components/VoiceRecorder';
import { messagesApi } from '../api/messages';
import { roomsApi } from '../api/rooms';
import { PickedFile, uploadApi } from '../api/upload';
import { setActiveConversationKey } from '../notifications/push';
import { RootStackParamList } from '../navigation/types';
import { OutgoingMessage, socketManager } from '../realtime/socket';
import { useAuthStore } from '../store/authStore';
import { useCallStore } from '../store/callStore';
import { useCameraCaptureStore } from '../store/cameraCaptureStore';
import { useChatStore } from '../store/chatStore';
import { useDraftStore } from '../store/draftStore';
import { useDMStore } from '../store/dmStore';
import { usePresenceStore } from '../store/presenceStore';
import { useRoomStore } from '../store/roomStore';
import { useUserCacheStore } from '../store/userCacheStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radii } from '../theme/tokens';
import { Message, UserSummary } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversation'>;

interface PendingAttachment extends PickedFile {
  kind: 'image' | 'file';
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatLastSeen(iso?: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'last seen just now';
  if (mins < 60) return `last seen ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${Math.round(hours / 24)}d ago`;
}

function generateClientId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// How long an optimistically-sent message waits for the server echo before it's marked
// failed with a retry option — generous enough to cover the Render free-tier cold start.
const SEND_TIMEOUT_MS = 20_000;

function previewFor(message: Message): string {
  if (message.content?.trim()) return message.content;
  switch (message.messageType) {
    case 'IMAGE': return '📷 Photo';
    case 'FILE': return '📎 File';
    case 'AUDIO': return '🎤 Voice message';
    case 'VIDEO': return '🎬 Video';
    default: return 'Message';
  }
}

interface ReplyDraft {
  id: string;
  sender: string;
  snippet: string;
}

// Stable reference for the "nobody typing" case — a fresh `?? []` on every
// selector call would give Zustand's snapshot comparison a new array each
// render and infinite-loop ("Maximum update depth exceeded").
const NO_TYPING_USERS: string[] = [];

export default function ConversationScreen({ route, navigation }: Props) {
  const { tokens } = useTheme();
  const { roomId, name, kind } = route.params;
  const conversationId = kind === 'dm' ? roomId.slice(3) : null;
  const username = useAuthStore((s) => s.user?.username);
  const { messagesByRoom, fetchMessages, fetchDMMessages, upsertMessage, markMessageFailed } = useChatStore();
  const typingUsers = useChatStore((s) => s.typingUsers[roomId] ?? NO_TYPING_USERS);
  const setActiveConversation = useDMStore((s) => s.setActiveConversation);
  const [draft, setDraft] = useState('');
  const [draftDirty, setDraftDirty] = useState(false);
  const persistedDraft = useDraftStore((s) => s.drafts[roomId]);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<UserSummary | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyDraft | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [actionSheetMessage, setActionSheetMessage] = useState<Message | null>(null);
  const [forwardingIds, setForwardingIds] = useState<string[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filePreviewFile, setFilePreviewFile] = useState<{ url: string; messageType: 'FILE' | 'VIDEO' } | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const room = useRoomStore((s) => (kind === 'room' ? s.myRooms.find((r) => r.roomId === roomId) : undefined));
  const listRef = useRef<FlatList>(null);
  const isNearBottomRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const readSentRef = useRef<Set<string>>(new Set());
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const prevMessageCountRef = useRef(0);

  const messages = messagesByRoom[roomId] ?? [];
  // FlatList is rendered `inverted` (WhatsApp-style: newest message anchored at the
  // bottom without any scroll-to-end call, and immune to keyboard-driven resizes) which
  // requires the underlying data newest-first.
  const invertedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const scheduleSendTimeout = useCallback((clientId: string) => {
    if (sendTimeoutsRef.current[clientId]) clearTimeout(sendTimeoutsRef.current[clientId]);
    sendTimeoutsRef.current[clientId] = setTimeout(() => {
      delete sendTimeoutsRef.current[clientId];
      markMessageFailed(roomId, clientId);
    }, SEND_TIMEOUT_MS);
  }, [roomId, markMessageFailed]);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const last = messages[messages.length - 1];
      if (!isNearBottomRef.current && last && last.sender !== username) {
        setNewMessageCount((c) => c + 1);
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, username]);

  const jumpToMessage = useCallback((messageId: string) => {
    const index = invertedMessages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      Alert.alert('Message not found', 'This message is too far back to jump to right now.');
      return;
    }
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    setHighlightedMessageId(messageId);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 1500);
  }, [invertedMessages]);

  // Jump to a message passed in from global search — waits for this room's fetchMessages/
  // fetchDMMessages (triggered by the mount effect below) to land before attempting the jump,
  // since navigating here fresh means `messages` starts out empty.
  const [pendingHighlight, setPendingHighlight] = useState(route.params.highlightMessageId ?? null);
  useEffect(() => {
    if (!pendingHighlight || messages.length === 0) return;
    jumpToMessage(pendingHighlight);
    setPendingHighlight(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingHighlight, messages]);
  const isSelecting = selectedIds.size > 0;
  const allSelectedMine = isSelecting && Array.from(selectedIds).every((id) => messages.find((m) => m.id === id)?.sender === username);

  const toggleSelect = useCallback((messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }, []);

  const confirmDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    Alert.alert(ids.length > 1 ? `Delete ${ids.length} messages?` : 'Delete message?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          ids.forEach((id) => {
            if (kind === 'dm' && conversationId) socketManager.deleteDMMessage(conversationId, id);
            else socketManager.deleteRoomMessage(roomId, id);
          });
          setSelectedIds(new Set());
        },
      },
    ]);
  };

  const typingOthers = typingUsers.filter((u) => u !== username);

  const conversation = useDMStore((s) =>
    kind === 'dm' && conversationId
      ? [...s.conversations, ...s.requests].find((c) => c.id === conversationId)
      : undefined,
  );
  const otherUsername = conversation?.participants.find((p) => p !== username);
  const online = usePresenceStore((s) => (otherUsername ? s.isOnline(otherUsername) : undefined));
  const getUser = useUserCacheStore((s) => s.getUser);
  const cachedUsers = useUserCacheStore((s) => s.users);
  const startOutgoingCall = useCallStore((s) => s.startOutgoingCall);
  const callIdle = useCallStore((s) => s.callState === 'idle');

  useEffect(() => {
    if (!otherUsername) return;
    getUser(otherUsername).then(setOtherUser);
  }, [otherUsername, getUser]);

  const typingKey = typingOthers.join('|');
  useEffect(() => {
    if (kind !== 'room') return;
    typingOthers.forEach((u) => {
      if (!cachedUsers[u]) getUser(u);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingKey, kind]);

  const typingLabel =
    typingOthers.length === 0
      ? null
      : typingOthers.length === 1
        ? `${cachedUsers[typingOthers[0]]?.displayName || cachedUsers[typingOthers[0]]?.uniqueHandle || typingOthers[0]} is typing…`
        : `${typingOthers.length} people are typing…`;

  const stopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (kind === 'dm' && conversationId) socketManager.sendDMTyping(conversationId, false);
      else socketManager.sendTyping(roomId, false);
    }
  };

  const handleDraftChange = (text: string) => {
    setDraft(text);
    setDraftDirty(true);
    if (editingMessage) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      if (kind === 'dm' && conversationId) socketManager.sendDMTyping(conversationId, true);
      else socketManager.sendTyping(roomId, true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
    // Debounced so a fast typist doesn't hit AsyncStorage on every keystroke.
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = setTimeout(() => useDraftStore.getState().setDraft(roomId, text), 400);
  };

  // Restore a previously typed-but-unsent draft once it's available from storage —
  // gated on draftDirty so it never clobbers text the user has already started typing.
  useEffect(() => {
    if (!draftDirty && !editingMessage && persistedDraft && persistedDraft !== draft) {
      setDraft(persistedDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedDraft]);

  // Flush any pending debounced draft save immediately if the screen unmounts
  // mid-debounce (e.g. the user types then quickly navigates back).
  const latestDraftRef = useRef(draft);
  const isEditingRef = useRef(false);
  useEffect(() => { latestDraftRef.current = draft; }, [draft]);
  useEffect(() => { isEditingRef.current = !!editingMessage; }, [editingMessage]);
  useEffect(() => {
    return () => {
      if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
      if (!isEditingRef.current) useDraftStore.getState().setDraft(roomId, latestDraftRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    // Route's roomId is already "dm:<id>" for DMs (matching the push notification
    // handler's key format below) but is the raw id for rooms, so prefix that case.
    setActiveConversationKey(kind === 'dm' ? roomId : `room:${roomId}`);

    if (kind === 'dm' && conversationId) {
      fetchDMMessages(conversationId);
      setActiveConversation(conversationId);
      // Incoming DMs arrive on one shared per-user queue (see socket.ts), not a
      // per-conversation topic — nothing to subscribe to here, chatStore already
      // gets updated globally and this screen just reads from it.
      const unsubscribeError = socketManager.onError(setSocketError);
      return () => {
        unsubscribeError();
        setActiveConversation(null);
        setActiveConversationKey(null);
        stopTyping();
      };
    }
    fetchMessages(roomId);
    useRoomStore.getState().clearUnread(roomId);
    const unsubscribeRoom = socketManager.subscribeRoom(roomId, upsertMessage);
    const unsubscribeError = socketManager.onError(setSocketError);
    return () => {
      unsubscribeRoom();
      unsubscribeError();
      setActiveConversationKey(null);
      stopTyping();
    };
  }, [roomId, kind, conversationId, fetchMessages, fetchDMMessages, upsertMessage, setActiveConversation]);

  useEffect(() => {
    if (!username) return;
    messages.forEach((m) => {
      if (m.sender === username || m.deleted) return;
      if (m.readBy.includes(username)) return;
      if (readSentRef.current.has(m.id)) return;
      readSentRef.current.add(m.id);
      if (kind === 'dm' && conversationId) socketManager.sendDMReadReceipt(conversationId, m.id);
      else socketManager.sendReadReceipt(roomId, m.id);
    });
  }, [messages, username, kind, conversationId, roomId]);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    if (kind === 'dm' && conversationId) socketManager.reactToDMMessage(conversationId, messageId, emoji);
    else socketManager.reactToRoomMessage(roomId, messageId, emoji);
  }, [kind, conversationId, roomId]);
  const handleRowReact = useCallback((item: Message, emoji: string) => sendReaction(item.id, emoji), [sendReaction]);

  const copyMessage = async (message: Message) => {
    if (!message.content) return;
    await Clipboard.setStringAsync(message.content);
  };

  const toggleStar = async (message: Message) => {
    try {
      const updated = await messagesApi.toggleStar(message.id);
      upsertMessage(updated);
    } catch {
      // Non-fatal — user can just retry the tap.
    }
  };

  const togglePin = async (message: Message) => {
    if (kind !== 'room') return;
    const isPinned = room?.pinnedMessages?.includes(message.id) ?? false;
    try {
      const updated = isPinned
        ? await roomsApi.unpinMessage(roomId, message.id)
        : await roomsApi.pinMessage(roomId, message.id);
      useRoomStore.getState().applyRoomUpdate(updated);
    } catch (err: any) {
      Alert.alert('Could not pin message', err?.response?.data?.error ?? 'Please try again.');
    }
  };

  const showPinnedMessages = () => {
    if (!room?.pinnedMessages?.length) return;
    const pinned = room.pinnedMessages
      .map((id) => messages.find((m) => m.id === id))
      .filter((m): m is Message => !!m);
    if (pinned.length === 0) {
      Alert.alert('Pinned messages', 'Pinned message no longer available.');
      return;
    }
    // Max 3 pinned messages per room, which fits Alert's practical button limit —
    // tapping one jumps straight to it, matching WhatsApp's pinned-bar behavior.
    const buttons: AlertButton[] = [
      ...pinned.map((m) => ({ text: `${m.senderName}: ${previewFor(m)}`, onPress: () => jumpToMessage(m.id) })),
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert('Pinned messages', 'Tap one to jump to it', buttons);
  };

  const startReply = useCallback((message: Message) => {
    setEditingMessage(null);
    setReplyingTo({
      id: message.id,
      sender: message.sender === username ? 'You' : message.senderName,
      snippet: previewFor(message),
    });
  }, [username]);

  const startEdit = (message: Message) => {
    setReplyingTo(null);
    setEditingMessage(message);
    setDraft(message.content);
  };

  const confirmDelete = (message: Message) => {
    Alert.alert('Delete message?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (kind === 'dm' && conversationId) socketManager.deleteDMMessage(conversationId, message.id);
          else socketManager.deleteRoomMessage(roomId, message.id);
        },
      },
    ]);
  };

  /** Inserts an instant local bubble and fires the send — sending() builds the socket payload. */
  const sendOptimistic = (
    fields: Pick<Message, 'content' | 'messageType' | 'fileUrl' | 'durationSeconds' | 'waveform'>,
    sending: (payload: OutgoingMessage) => void,
  ) => {
    const clientId = generateClientId();
    const optimistic: Message = {
      id: clientId,
      roomId,
      sender: username ?? '',
      senderName: username ?? '',
      clientId,
      readBy: [],
      timestamp: new Date().toISOString(),
      status: 'sending',
      ...(replyingTo ? { replyToId: replyingTo.id, replyToSnippet: replyingTo.snippet, replyToSender: replyingTo.sender } : {}),
      ...fields,
    };
    upsertMessage(optimistic);
    sending({
      content: fields.content,
      fileUrl: fields.fileUrl,
      messageType: fields.messageType,
      durationSeconds: fields.durationSeconds,
      waveform: fields.waveform,
      clientId,
      ...(replyingTo ? { replyToId: replyingTo.id, replyToSnippet: replyingTo.snippet, replyToSender: replyingTo.sender } : {}),
    });
    scheduleSendTimeout(clientId);
  };

  const retryMessage = useCallback((message: Message) => {
    if (!message.clientId) return;
    upsertMessage({ ...message, status: 'sending' });
    const payload = {
      content: message.content,
      fileUrl: message.fileUrl,
      messageType: message.messageType,
      clientId: message.clientId,
      durationSeconds: message.durationSeconds,
      waveform: message.waveform,
      ...(message.replyToId
        ? { replyToId: message.replyToId, replyToSnippet: message.replyToSnippet, replyToSender: message.replyToSender }
        : {}),
    };
    if (kind === 'dm' && conversationId) socketManager.sendDMMessage(conversationId, payload);
    else socketManager.sendRoomPayload(roomId, payload);
    scheduleSendTimeout(message.clientId);
  }, [kind, conversationId, roomId, upsertMessage, scheduleSendTimeout]);

  const handlePressFile = useCallback((msg: Message) => {
    if (!msg.fileUrl) return;
    if (msg.messageType === 'VIDEO') setVideoPreviewUrl(msg.fileUrl);
    else setFilePreviewFile({ url: msg.fileUrl, messageType: 'FILE' });
  }, []);

  // Stable renderItem — combined with MessageRow's React.memo, this keeps a new message or a
  // typing-indicator update from re-rendering every already-mounted row in the thread.
  const renderMessageItem = useCallback(({ item }: { item: Message }) => {
    const mine = item.sender === username;
    const read = kind === 'dm' ? (otherUsername ? item.readBy.includes(otherUsername) : false) : item.readBy.length > 0;
    return (
      <View style={styles.invertedItem}>
        <MessageRow
          item={item}
          mine={mine}
          read={read}
          highlighted={item.id === highlightedMessageId}
          tokens={tokens}
          myUsername={username}
          formatTime={formatTime}
          onPressImage={setViewerUrl}
          onPressFile={handlePressFile}
          onLongPress={setActionSheetMessage}
          onReply={startReply}
          onReact={handleRowReact}
          onJumpToReply={jumpToMessage}
          onRetry={retryMessage}
          selectionMode={isSelecting}
          selected={selectedIds.has(item.id)}
          onToggleSelect={toggleSelect}
        />
      </View>
    );
  }, [
    username, kind, otherUsername, highlightedMessageId, tokens, formatTime, handlePressFile,
    startReply, handleRowReact, jumpToMessage, retryMessage, isSelecting, selectedIds, toggleSelect,
  ]);

  const handleSend = async () => {
    if (editingMessage) {
      const text = draft.trim();
      if (!text) return;
      if (kind === 'dm' && conversationId) socketManager.editDMMessage(conversationId, editingMessage.id, text);
      else socketManager.editRoomMessage(roomId, editingMessage.id, text);
      setEditingMessage(null);
      setDraft('');
      stopTyping();
      return;
    }
    if (pendingAttachment) {
      const caption = draft.trim();
      setIsUploading(true);
      setSocketError(null);
      try {
        const result = await uploadApi.uploadFile(pendingAttachment);
        sendOptimistic(
          { content: caption, fileUrl: result.url, messageType: result.messageType },
          (payload) =>
            kind === 'dm' && conversationId
              ? socketManager.sendDMMessage(conversationId, payload)
              : socketManager.sendRoomPayload(roomId, payload),
        );
        setPendingAttachment(null);
        setDraft('');
        setDraftDirty(false);
        if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
        useDraftStore.getState().clearDraft(roomId);
        setReplyingTo(null);
      } catch (err: any) {
        setSocketError(err?.message ?? 'Upload failed. Please try again.');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const text = draft.trim();
    if (!text) return;
    sendOptimistic({ content: text, messageType: 'TEXT' }, (payload) =>
      kind === 'dm' && conversationId
        ? socketManager.sendDMMessage(conversationId, payload)
        : socketManager.sendRoomPayload(roomId, payload),
    );
    setDraft('');
    setDraftDirty(false);
    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    useDraftStore.getState().clearDraft(roomId);
    setReplyingTo(null);
    stopTyping();
  };

  const handleVoiceSend = (url: string, durationSeconds: number, waveform: number[]) => {
    sendOptimistic(
      { content: `Voice message (${formatDuration(durationSeconds)})`, fileUrl: url, messageType: 'AUDIO', durationSeconds, waveform },
      (payload) =>
        kind === 'dm' && conversationId
          ? socketManager.sendDMMessage(conversationId, payload)
          : socketManager.sendRoomPayload(roomId, payload),
    );
    setIsRecordingVoice(false);
    setReplyingTo(null);
  };

  // Pick up a photo handed back from CameraCaptureScreen's "Use Photo" confirm
  // step, staging it exactly like a gallery pick (caption + send happens here as usual).
  useFocusEffect(
    useCallback(() => {
      const photo = useCameraCaptureStore.getState().consumeCapturedPhoto();
      if (photo) setPendingAttachment({ kind: 'image', ...photo });
    }, []),
  );

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSocketError('Photo library access is needed to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPendingAttachment({
      kind: 'image',
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handleCapturePhoto = () => {
    navigation.navigate('CameraCapture');
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPendingAttachment({
      kind: 'file',
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
    });
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: tokens.background }]}>
      {/* react-native-keyboard-controller's KeyboardAvoidingView tracks the keyboard's native
          animation directly (via Reanimated) instead of depending on Android's windowSoftInputMode
          resize behavior, which proved unreliable here — the composer stayed hidden behind the
          keyboard with RN's built-in component even with the "correct" behavior prop. 'padding'
          works consistently on both platforms with this implementation. */}
      <KeyboardAvoidingView style={styles.screen} behavior="padding">
      {isSelecting ? (
        <View style={[styles.header, { borderBottomColor: tokens.border }]}>
          <TouchableOpacity onPress={() => setSelectedIds(new Set())} hitSlop={12}>
            <Feather name="x" size={22} color={tokens.text} />
          </TouchableOpacity>
          <Text style={[styles.name, { color: tokens.text, flex: 1 }]}>{selectedIds.size} selected</Text>
          <View style={{ flexDirection: 'row', gap: 18 }}>
            <TouchableOpacity onPress={() => setForwardingIds(Array.from(selectedIds))} hitSlop={8}>
              <Feather name="corner-up-right" size={20} color={tokens.accentStrong} />
            </TouchableOpacity>
            {allSelectedMine ? (
              <TouchableOpacity onPress={confirmDeleteSelected} hitSlop={8}>
                <Feather name="trash-2" size={20} color="#DC5B4E" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={[styles.header, { borderBottomColor: tokens.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Feather name="chevron-left" size={22} color={tokens.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.who}
            onPress={() =>
              kind === 'dm' && otherUsername
                ? navigation.navigate('UserProfile', { username: otherUsername, roomId, name })
                : navigation.navigate('GroupInfo', { roomId, name })
            }
          >
            <Avatar
              initials={initialsFor(name)}
              color={tokens.accent}
              textColor={tokens.onAccent}
              size={34}
              imageUrl={otherUser?.avatarUrl}
              online={kind === 'dm' ? online : undefined}
              ringColor={tokens.background}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: tokens.text }]} numberOfLines={1}>{name}</Text>
              {kind === 'dm' ? (
                <Text style={{ color: typingLabel || online ? tokens.accentStrong : tokens.textMuted, fontSize: 11.5, marginTop: 1 }}>
                  {typingLabel ? 'typing…' : online ? 'online' : formatLastSeen(otherUser?.lastSeen)}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
          {kind === 'dm' && conversationId && otherUsername && callIdle ? (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <TouchableOpacity onPress={() => startOutgoingCall(conversationId, otherUsername, 'AUDIO')} hitSlop={8}>
                <Feather name="phone" size={19} color={tokens.accentStrong} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => startOutgoingCall(conversationId, otherUsername, 'VIDEO')} hitSlop={8}>
                <Feather name="video" size={20} color={tokens.accentStrong} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {socketError ? (
        <Text style={{ color: '#DC5B4E', fontSize: 12, textAlign: 'center', paddingVertical: 6 }}>
          {socketError}
        </Text>
      ) : null}

      {kind === 'room' && typingLabel ? (
        <Text style={{ color: tokens.textMuted, fontSize: 11.5, paddingHorizontal: 16, paddingTop: 4 }}>
          {typingLabel}
        </Text>
      ) : null}

      {kind === 'room' && room?.pinnedMessages?.length ? (
        <TouchableOpacity
          style={[styles.pinnedBar, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}
          onPress={showPinnedMessages}
        >
          <Feather name="bookmark" size={13} color={tokens.accentStrong} />
          <Text style={{ color: tokens.accentStrong, fontSize: 12.5, fontFamily: fonts.label }}>
            {room.pinnedMessages.length === 1 ? '1 pinned message' : `${room.pinnedMessages.length} pinned messages`}
          </Text>
        </TouchableOpacity>
      ) : null}

      <FlatList
        ref={listRef}
        inverted
        data={invertedMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.thread}
        onScroll={(e) => {
          // Inverted list: offset 0 is the newest message (visually the bottom), so
          // "near bottom" means a small offset, not a large one.
          const nearBottom = e.nativeEvent.contentOffset.y <= 100;
          isNearBottomRef.current = nearBottom;
          if (nearBottom) setNewMessageCount((c) => (c > 0 ? 0 : c));
        }}
        scrollEventThrottle={150}
        onScrollToIndexFailed={(info) => {
          // Target row isn't measured yet (variable message heights mean no getItemLayout) —
          // scroll to the nearest approximate offset, then retry once layout settles.
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => {
            if (info.index < invertedMessages.length) {
              listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            }
          }, 100);
        }}
        renderItem={renderMessageItem}
      />

      {newMessageCount > 0 ? (
        <TouchableOpacity
          style={[styles.jumpBtn, { backgroundColor: tokens.accent }]}
          onPress={() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
            setNewMessageCount(0);
          }}
        >
          <Feather name="arrow-down" size={13} color={tokens.onAccent} />
          <Text style={{ color: tokens.onAccent, fontFamily: fonts.label, fontSize: 12 }}>
            {newMessageCount} new {newMessageCount === 1 ? 'message' : 'messages'}
          </Text>
        </TouchableOpacity>
      ) : null}

      {pendingAttachment ? (
        <View style={[styles.attachmentPreview, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
          {pendingAttachment.kind === 'image' ? (
            <Image source={{ uri: pendingAttachment.uri }} style={styles.attachmentThumb} />
          ) : (
            <View style={[styles.attachmentThumb, styles.attachmentFileIcon, { backgroundColor: tokens.accent }]}>
              <Feather name="file-text" size={18} color={tokens.onAccent} />
            </View>
          )}
          <Text style={[styles.attachmentName, { color: tokens.text }]} numberOfLines={1}>
            {pendingAttachment.name}
          </Text>
          <TouchableOpacity onPress={() => setPendingAttachment(null)} hitSlop={10} disabled={isUploading}>
            <Feather name="x" size={18} color={tokens.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {replyingTo ? (
        <View style={[styles.contextBar, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
          <View style={[styles.contextAccent, { backgroundColor: tokens.accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: tokens.accentStrong, fontSize: 12, fontFamily: fonts.label }} numberOfLines={1}>
              Replying to {replyingTo.sender}
            </Text>
            <Text style={{ color: tokens.textMuted, fontSize: 12.5 }} numberOfLines={1}>
              {replyingTo.snippet}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={10}>
            <Feather name="x" size={18} color={tokens.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {editingMessage ? (
        <View style={[styles.contextBar, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
          <View style={[styles.contextAccent, { backgroundColor: tokens.accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: tokens.accentStrong, fontSize: 12, fontFamily: fonts.label }}>Editing message</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingMessage(null);
              setDraft('');
            }}
            hitSlop={10}
          >
            <Feather name="x" size={18} color={tokens.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={[styles.composer, { backgroundColor: tokens.background, borderTopColor: tokens.border }]}>
        {isRecordingVoice ? (
          <VoiceRecorder tokens={tokens} onCancel={() => setIsRecordingVoice(false)} onSend={handleVoiceSend} />
        ) : (
          <>
            {!pendingAttachment && !editingMessage ? (
              <>
                <TouchableOpacity onPress={handleCapturePhoto} disabled={isUploading} hitSlop={8}>
                  <Feather name="camera" size={20} color={tokens.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePickImage} disabled={isUploading} hitSlop={8}>
                  <Feather name="image" size={20} color={tokens.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handlePickDocument} disabled={isUploading} hitSlop={8}>
                  <Feather name="paperclip" size={20} color={tokens.textMuted} />
                </TouchableOpacity>
              </>
            ) : null}
            <View style={[styles.field, { backgroundColor: tokens.surface }]}>
              <TextInput
                placeholder={pendingAttachment ? 'Add a caption…' : 'Message'}
                placeholderTextColor={tokens.textMuted}
                value={draft}
                onChangeText={handleDraftChange}
                editable={!isUploading}
                style={{ color: tokens.text, fontSize: 14 }}
                multiline
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={handleSend}
              />
            </View>
            {!draft.trim() && !pendingAttachment && !editingMessage ? (
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: tokens.accent }]}
                onPress={() => {
                  Keyboard.dismiss();
                  setIsRecordingVoice(true);
                }}
                disabled={isUploading}
              >
                <Feather name="mic" size={16} color={tokens.onAccent} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: tokens.accent, opacity: isUploading ? 0.6 : 1 }]}
                onPress={handleSend}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={tokens.onAccent} />
                ) : (
                  <Feather name={editingMessage ? 'check' : 'arrow-right'} size={16} color={tokens.onAccent} />
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
      </KeyboardAvoidingView>

      <ImageViewerModal url={viewerUrl} onClose={() => setViewerUrl(null)} />

      <MessageActionSheet
        visible={!!actionSheetMessage}
        tokens={tokens}
        mine={actionSheetMessage?.sender === username}
        canEdit={actionSheetMessage?.messageType === 'TEXT'}
        canCopy={!!actionSheetMessage?.content && !actionSheetMessage?.deleted}
        isStarred={!!username && !!actionSheetMessage?.starred?.includes(username)}
        canPin={kind === 'room'}
        isPinned={!!actionSheetMessage && (room?.pinnedMessages?.includes(actionSheetMessage.id) ?? false)}
        onClose={() => setActionSheetMessage(null)}
        onReact={(emoji) => {
          if (actionSheetMessage) sendReaction(actionSheetMessage.id, emoji);
          setActionSheetMessage(null);
        }}
        onEdit={() => {
          if (actionSheetMessage) startEdit(actionSheetMessage);
          setActionSheetMessage(null);
        }}
        onDelete={() => {
          if (actionSheetMessage) confirmDelete(actionSheetMessage);
          setActionSheetMessage(null);
        }}
        onCopy={() => {
          if (actionSheetMessage) copyMessage(actionSheetMessage);
          setActionSheetMessage(null);
        }}
        onToggleStar={() => {
          if (actionSheetMessage) toggleStar(actionSheetMessage);
          setActionSheetMessage(null);
        }}
        onForward={() => {
          if (actionSheetMessage) setForwardingIds([actionSheetMessage.id]);
          setActionSheetMessage(null);
        }}
        onTogglePin={() => {
          if (actionSheetMessage) togglePin(actionSheetMessage);
          setActionSheetMessage(null);
        }}
        onSelect={() => {
          if (actionSheetMessage) toggleSelect(actionSheetMessage.id);
          setActionSheetMessage(null);
        }}
      />

      <ForwardMessageModal
        messageIds={forwardingIds}
        onClose={() => setForwardingIds([])}
        onForwarded={() => {
          setForwardingIds([]);
          setSelectedIds(new Set());
        }}
      />

      <FilePreviewModal
        fileUrl={filePreviewFile?.url ?? null}
        messageType={filePreviewFile?.messageType}
        onClose={() => setFilePreviewFile(null)}
      />

      <VideoPlayerModal url={videoPreviewUrl} onClose={() => setVideoPreviewUrl(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: -0.2 },
  thread: { padding: 14, gap: 8, flexGrow: 1 },
  // Counter-flips each row so content renders right-side up inside the `inverted` FlatList.
  invertedItem: { transform: [{ scaleY: -1 }] },
  pinnedBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  attachmentPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  attachmentThumb: { width: 40, height: 40, borderRadius: 9 },
  attachmentFileIcon: { alignItems: 'center', justifyContent: 'center' },
  attachmentName: { flex: 1, fontSize: 13 },
  contextBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1 },
  contextAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  field: { flex: 1, borderRadius: radii.control, paddingVertical: 11, paddingHorizontal: 15 },
  sendBtn: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  jumpBtn: {
    position: 'absolute',
    bottom: 84,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
