/**
 * In-memory token store — avoids localStorage so the JWT is not accessible
 * to injected scripts. Cleared on page close. HTTP requests use the httpOnly
 * cookie automatically (withCredentials: true); the token here is only needed
 * for the STOMP WebSocket connect header.
 */
let _token: string | null = null

export const tokenProvider = {
  get: (): string | null => _token,
  set: (token: string | null): void => { _token = token },
}
