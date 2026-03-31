import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,  // send httpOnly cookies (set by backend on login/register)
})

client.interceptors.request.use((config) => {
  // Also send Authorization header for WebSocket handshake compatibility
  // Token is kept in-memory (Zustand) only — not in localStorage
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      // Dispatch event so App.tsx can call useAuthStore.logout() inside React context,
      // avoiding circular imports (client → authStore → api/auth → client)
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export default client
