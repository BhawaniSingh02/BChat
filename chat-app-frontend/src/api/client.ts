import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { tokenProvider } from './tokenProvider'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // send httpOnly cookies (set by backend on login/register)
})

client.interceptors.request.use((config) => {
  // Also send Authorization header for WebSocket handshake compatibility.
  // Token is kept in-memory only (tokenProvider) — never in localStorage.
  const token = tokenProvider.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Extend AxiosRequestConfig to track retry state
interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequest
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh')

    // On 401, attempt a silent token refresh once — but never for the refresh endpoint itself
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
      originalRequest._retry = true
      try {
        const { data } = await client.post<{ token: string }>('/auth/refresh')
        tokenProvider.set(data.token)
        originalRequest.headers.Authorization = `Bearer ${data.token}`
        return client(originalRequest)
      } catch {
        // Refresh failed — session is fully expired
        tokenProvider.set(null)
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }

    if (error.response?.status === 401 && isRefreshEndpoint) {
      tokenProvider.set(null)
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }

    return Promise.reject(error)
  }
)

export default client
