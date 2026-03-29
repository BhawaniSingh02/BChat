import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Avatar from '../../components/ui/Avatar'

describe('Avatar', () => {
  it('renders initials from name', () => {
    render(<Avatar name="Alice" />)
    expect(screen.getByLabelText('Alice')).toBeInTheDocument()
    expect(screen.getByText('AL')).toBeInTheDocument()
  })

  it('renders image when src is provided', () => {
    render(<Avatar name="Alice" src="https://example.com/pic.jpg" />)
    const img = screen.getByRole('img', { name: 'Alice' })
    expect(img).toHaveAttribute('src', 'https://example.com/pic.jpg')
  })

  it('shows green dot when online=true', () => {
    render(<Avatar name="Alice" online />)
    const dot = screen.getByTestId('presence-dot')
    expect(dot).toHaveClass('bg-green-400')
  })

  it('shows gray dot when online=false', () => {
    render(<Avatar name="Alice" online={false} />)
    const dot = screen.getByTestId('presence-dot')
    expect(dot).toHaveClass('bg-gray-400')
  })

  it('renders no presence dot when online is undefined', () => {
    render(<Avatar name="Alice" />)
    expect(screen.queryByTestId('presence-dot')).not.toBeInTheDocument()
  })

  it('applies sm size classes', () => {
    render(<Avatar name="Alice" size="sm" />)
    expect(screen.getByLabelText('Alice')).toHaveClass('w-8', 'h-8')
  })

  it('applies lg size classes', () => {
    render(<Avatar name="Alice" size="lg" />)
    expect(screen.getByLabelText('Alice')).toHaveClass('w-12', 'h-12')
  })
})
