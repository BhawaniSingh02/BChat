import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FloatingInput from '../../components/ui/FloatingInput'

describe('FloatingInput', () => {
  it('renders the floating label tied to the input', () => {
    render(<FloatingInput label="Email or username" value="" onChange={() => {}} />)
    expect(screen.getByLabelText('Email or username')).toBeInTheDocument()
  })

  it('reveals/hides the password via the toggle', () => {
    render(<FloatingInput label="Password" type="password" value="secret" onChange={() => {}} />)
    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')

    fireEvent.click(screen.getByTestId('password-toggle'))
    expect((screen.getByLabelText('Password') as HTMLInputElement).type).toBe('text')

    fireEvent.click(screen.getByTestId('password-toggle'))
    expect((screen.getByLabelText('Password') as HTMLInputElement).type).toBe('password')
  })

  it('has no password toggle for text inputs', () => {
    render(<FloatingInput label="Email" type="text" value="" onChange={() => {}} />)
    expect(screen.queryByTestId('password-toggle')).not.toBeInTheDocument()
  })

  it('hides the password toggle until something is typed', () => {
    const { rerender } = render(<FloatingInput label="Password" type="password" value="" onChange={() => {}} />)
    expect(screen.queryByTestId('password-toggle')).not.toBeInTheDocument()
    rerender(<FloatingInput label="Password" type="password" value="a" onChange={() => {}} />)
    expect(screen.getByTestId('password-toggle')).toBeInTheDocument()
  })

  it('forwards onChange', () => {
    const onChange = vi.fn()
    render(<FloatingInput label="Email" value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a' } })
    expect(onChange).toHaveBeenCalled()
  })
})
