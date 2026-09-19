/**
 * Design tokens for Baaat Mobile — "minimal & bold" direction, approved 2026-08-14.
 * See planning/MOBILE_PLAN.md for the source mockup and rationale.
 * Values mirror the web app's brand (teal accent, "Baaat" wordmark) but the
 * surrounding system (flat bubbles, no wallpaper, icon-only tabs) is mobile-native,
 * not a port of chat-app-frontend's WhatsApp-styled CSS.
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  background: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  onAccent: string;
  tabInactive: string;
}

export const lightTheme: ThemeTokens = {
  background: '#FFFFFF',
  surface: '#F4F5F6',
  surface2: '#EBEDEF',
  border: '#E6E8EA',
  text: '#0A0D0F',
  textMuted: '#6C7378',
  accent: '#0D9488',
  accentStrong: '#0F766E',
  onAccent: '#FFFFFF',
  tabInactive: '#B7BCBF',
};

export const darkTheme: ThemeTokens = {
  background: '#0A0C0D',
  surface: '#131617',
  surface2: '#1C2022',
  border: '#23282B',
  text: '#F3F5F6',
  textMuted: '#8B9296',
  accent: '#2DD4BF',
  accentStrong: '#5EEAD4',
  onAccent: '#062420',
  tabInactive: '#4A5155',
};

export function getTheme(mode: ThemeMode): ThemeTokens {
  return mode === 'dark' ? darkTheme : lightTheme;
}

/** Curated flat avatar fills — deliberately not a per-contact rainbow. */
export const avatarPalette = ['#0D9488', '#0A0D0F', '#C2703D'] as const;

export const fonts = {
  display: 'Archivo_800ExtraBold',
  heading: 'Archivo_700Bold',
  label: 'Archivo_600SemiBold',
} as const;

export const radii = {
  bubble: 18,
  card: 14,
  control: 13,
  avatar: 12,
} as const;
