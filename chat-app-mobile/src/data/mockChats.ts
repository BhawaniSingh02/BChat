import { avatarPalette } from '../theme/tokens';

export interface MockChat {
  id: string;
  name: string;
  initials: string;
  preview: string;
  time: string;
  unread?: number;
  typing?: boolean;
  avatarColor: string;
}

export const mockChats: MockChat[] = [
  { id: '1', name: 'Meera Kapoor', initials: 'MK', preview: 'Sent the files, check when free', time: '9:41', unread: 2, avatarColor: avatarPalette[0] },
  { id: '2', name: 'Dev Team', initials: 'DT', preview: 'Rahul: pushed the fix', time: '9:12', avatarColor: avatarPalette[1] },
  { id: '3', name: 'Arjun Shah', initials: 'AS', preview: 'Voice message · 0:42', time: 'Yesterday', avatarColor: avatarPalette[2] },
  { id: '4', name: 'Ananya Verma', initials: 'AV', preview: 'typing…', time: '9:03', typing: true, avatarColor: avatarPalette[1] },
  { id: '5', name: 'Design Crit', initials: 'DC', preview: 'Priya: Friday works for me', time: 'Yesterday', avatarColor: avatarPalette[0] },
];

export interface MockMessage {
  id: string;
  mine: boolean;
  text: string;
  time: string;
}

export const mockThread: MockMessage[] = [
  { id: '1', mine: false, text: 'Hey! Are we still on for the sync tomorrow?', time: '9:14' },
  { id: '2', mine: true, text: 'Yep, 10am works for me', time: '9:15 · Read' },
  { id: '3', mine: false, text: "Perfect. I'll send the deck tonight.", time: '9:15' },
];
