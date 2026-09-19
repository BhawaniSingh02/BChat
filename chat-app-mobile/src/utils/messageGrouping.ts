import { Message } from '../types';

/** Same-sender + within-5-minutes window used to decide whether consecutive images group. */
export function withinGroup(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 5 * 60 * 1000;
}

function isSameDay(a: string, b: string): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function isGroupableImage(message: Message): boolean {
  return (
    message.messageType === 'IMAGE' &&
    !!message.fileUrl &&
    !message.replyToId &&
    !message.forwardedFrom &&
    !message.deleted &&
    // ConversationScreen's send flow already sends an empty content string for an image with
    // no caption (it never echoes the filename into content the way web's MessageInput used
    // to), so this is an exact signal, not a heuristic — no fuzzy matching needed here.
    !message.content?.trim()
  );
}

// Sanity cap on a single grouped run — the grid itself only ever shows MAX_VISIBLE_TILES
// (see MediaGrid.tsx), this just bounds the underlying array for a pathological huge batch.
const MAX_GROUP_RUN = 50;

export type RenderUnit =
  | { type: 'single'; message: Message }
  | { type: 'imageGroup'; messages: Message[] };

/**
 * Collapses consecutive groupable IMAGE messages (same sender, within the 5-minute/same-day
 * window, no caption/reply/forward) into a single imageGroup render unit, so a burst of
 * photos renders as one compact grid instead of one full bubble per photo. `messages` must be
 * oldest-first (chronological order) — NOT the inverted, newest-first copy the FlatList
 * actually renders; reverse the *result* of this function for that, not the input.
 */
export function buildRenderUnits(messages: Message[]): RenderUnit[] {
  const units: RenderUnit[] = [];
  let i = 0;
  while (i < messages.length) {
    const message = messages[i];
    if (isGroupableImage(message)) {
      const run = [message];
      let j = i + 1;
      while (
        j < messages.length &&
        run.length < MAX_GROUP_RUN &&
        isGroupableImage(messages[j]) &&
        messages[j].sender === message.sender &&
        withinGroup(messages[j - 1].timestamp, messages[j].timestamp) &&
        isSameDay(messages[j - 1].timestamp, messages[j].timestamp)
      ) {
        run.push(messages[j]);
        j++;
      }
      if (run.length >= 2) {
        units.push({ type: 'imageGroup', messages: run });
        i = j;
        continue;
      }
    }
    units.push({ type: 'single', message });
    i++;
  }
  return units;
}

export function renderUnitKey(unit: RenderUnit): string {
  return unit.type === 'single' ? unit.message.id : `group-${unit.messages[0].id}`;
}
