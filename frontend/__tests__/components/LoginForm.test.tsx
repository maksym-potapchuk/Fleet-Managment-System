/**
 * LoginForm tests
 *
 * WHY: This is the app's entry point. The password toggle is stateful local UI —
 * if the Eye button stops working users can't log in. The error must carry
 * role="alert" so screen readers announce it. onSubmit must forward the exact
 * values the user typed (not default state).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/login/LoginForm';

// LoginForm has no i18n, DnD, or external services — no mocks needed.

describe('LoginForm', () => {
  const defaultProps = {
    loading: false,
    error: '',
    onSubmit: vi.fn(),
  };

  // ─── Rendering ────────────────────────────────────────────────────────────

  it('renders email and password inputs', () => {
    render(<LoginForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  // ─── Password toggle ──────────────────────────────────────────────────────

  it('password input type is "password" by default', () => {
    render(<LoginForm {...defaultProps} />);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('toggles password input to type "text" when Eye button is clicked', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    // Button has aria-label that changes between "Показати пароль" / "Сховати пароль"
    const toggleBtn = screen.getByRole('button', { name: /пароль/i });
    await user.click(toggleBtn);

    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text');
  });

  it('toggles password back to type "password" on second click', async () => {
    const user = userEvent.setup();
    render(<LoginForm {...defaultProps} />);

    const toggleBtn = screen.getByRole('button', { name: /пароль/i });
    await user.click(toggleBtn);
    await user.click(toggleBtn);

    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
  });

  // ─── Form submission ─────────────────────────────────────────────────────

  it('calls onSubmit with the email and password the user typed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm loading={false} error="" onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText('name@company.com'), 'admin@fleet.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');

    fireEvent.submit(screen.getByRole('button', { name: /Увійти/ }).closest('form')!);

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith('admin@fleet.com', 'secret123');
  });

  // ─── Error display ────────────────────────────────────────────────────────

  it('does not render the error element when error prop is empty', () => {
    render(<LoginForm {...defaultProps} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error message with role="alert" when error prop is set', () => {
    render(<LoginForm loading={false} error="Невірний email або пароль" onSubmit={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Невірний email або пароль');
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it('disables the submit button while loading', () => {
    render(<LoginForm loading={true} error="" onSubmit={vi.fn()} />);
    // Any button with disabled attribute
    const buttons = screen.getAllByRole('button');
    const submitBtn = buttons.find((b) => b.hasAttribute('disabled'));
    expect(submitBtn).toBeDefined();
  });

  it('shows "Вхід" text while loading instead of "Увійти"', () => {
    render(<LoginForm loading={true} error="" onSubmit={vi.fn()} />);
    // Loading button may show "Вхід" or "Вхід..." — match with regex
    expect(screen.getByText(/Вхід/)).toBeInTheDocument();
    expect(screen.queryByText('Увійти')).not.toBeInTheDocument();
  });
});
