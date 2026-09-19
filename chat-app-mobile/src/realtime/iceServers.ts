import apiClient from '../api/client';

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

// STUN-only fallback for when the backend is unreachable. Enough for devices on
// the same network / friendly NATs; cross-network calls (phone on LTE, laptop on
// WiFi) generally need the TURN relay the backend endpoint provides.
const FALLBACK_STUN_ONLY: IceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let cached: IceServer[] | null = null;

/**
 * Fetches the ICE server list (STUN + TURN with credentials) from the backend —
 * see chat-app-backend's IceServerController. Server-provided so TURN relays can
 * be rotated without an app rebuild; the previously hardcoded OpenRelay public
 * TURN died and silently broke every cross-network call. Cached for the app
 * session after the first successful fetch.
 */
export async function getIceServers(): Promise<IceServer[]> {
  if (cached) return cached;
  try {
    const { data } = await apiClient.get<IceServer[]>('/webrtc/ice-servers');
    if (Array.isArray(data) && data.length > 0) {
      cached = data;
      return data;
    }
  } catch {
    // Backend unreachable — fall through to STUN-only rather than blocking the call.
  }
  return FALLBACK_STUN_ONLY;
}

/** Test-only: clears the session cache. */
export function resetIceServerCache(): void {
  cached = null;
}
