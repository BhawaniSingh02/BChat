import PlainMessageList, { type MessageListProps } from './PlainMessageList'
import VirtualizedMessageList from './VirtualizedMessageList'

export type { MessageListProps }

// Above this many messages, switch to the virtualized list. Below it, the
// plain `.map()` render is simpler and has zero virtualization risk — short
// conversations (the common case) never pay that complexity cost.
const VIRTUALIZE_THRESHOLD = 100

/**
 * Message list — picks the plain or virtualized implementation based on
 * message count. See PlainMessageList.tsx / VirtualizedMessageList.tsx.
 */
export default function MessageList(props: MessageListProps) {
  if (props.messages.length > VIRTUALIZE_THRESHOLD) {
    return <VirtualizedMessageList {...props} />
  }
  return <PlainMessageList {...props} />
}
