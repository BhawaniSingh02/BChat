import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Input from '../../components/ui/Input'

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Username" />)
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveClass('border-red-400')
  })

  it('applies error styling', () => {
    render(<Input error="Required" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-400', 'bg-red-50')
  })

  it('calls onChange when user types', async () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    await userEvent.type(screen.getByRole('textbox'), 'hello')
    expect(onChange).toHaveBeenCalled()
  })

  it('shows placeholder', () => {
    render(<Input placeholder="Enter text here" />)
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument()
  })

  it('reveals/hides the password via the toggle', async () => {
    render(<Input label="Password" type="password" value="secret" onChange={() => {}} />)
    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')

    const toggle = screen.getByTestId('password-toggle')
    expect(toggle).toHaveAttribute('aria-label', 'Show password')
    await userEvent.click(toggle)
    expect((screen.getByLabelText('Password') as HTMLInputElement).type).toBe('text')
    expect(screen.getByTestId('password-toggle')).toHaveAttribute('aria-label', 'Hide password')

    await userEvent.click(screen.getByTestId('password-toggle'))
    expect((screen.getByLabelText('Password') as HTMLInputElement).type).toBe('password')
  })

  it('does not render a password toggle for non-password inputs', () => {
    render(<Input label="Email or username" type="text" />)
    expect(screen.queryByTestId('password-toggle')).not.toBeInTheDocument()
  })
})
