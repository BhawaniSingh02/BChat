import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatsPanel from '../../components/ui/settings/ChatsPanel'
import { useThemeStore } from '../../store/themeStore'

function mockMatchMedia(prefersDark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: prefersDark, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('ChatsPanel (theme picker)', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
    useThemeStore.setState({ theme: 'system' })
  })

  it('renders the three theme options', () => {
    render(<ChatsPanel />)
    expect(screen.getByTestId('theme-option-light')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-dark')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-system')).toBeInTheDocument()
  })

  it('marks the active theme as checked', () => {
    useThemeStore.setState({ theme: 'dark' })
    render(<ChatsPanel />)
    expect(screen.getByTestId('theme-option-dark')).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByTestId('theme-option-light')).toHaveAttribute('aria-checked', 'false')
  })

  it('switches the theme and applies the dark class when Dark is chosen', () => {
    render(<ChatsPanel />)
    fireEvent.click(screen.getByTestId('theme-option-dark'))
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
