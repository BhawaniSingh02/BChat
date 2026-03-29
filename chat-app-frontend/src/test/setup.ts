import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock SockJS and STOMP to prevent real WebSocket connections in tests
vi.mock('sockjs-client', () => ({
  default: vi.fn(() => ({
    close: vi.fn(),
    onopen: null,
    onclose: null,
    onmessage: null,
  })),
}))

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn().mockImplementation(() => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
    connected: false,
    subscribe: vi.fn(),
    publish: vi.fn(),
  })),
}))

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})
