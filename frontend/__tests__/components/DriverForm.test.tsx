/**
 * DriverForm tests
 *
 * WHY: The phone validation encodes Polish phone business rules (digits-only,
 * must start with "48", 10–15 chars). A single character change in the regex
 * or length check lets drivers with invalid numbers into the system — which
 * then breaks downstream SMS/calling features. These rules must be locked in.
 *
 * We also cover: pre-fill from initialData, per-field error clearing on input,
 * backend error propagation, and cancel callback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DriverForm } from '@/components/driver/DriverForm';
import { Driver } from '@/types/driver';

// next-intl: return the translation key as-is so assertions are key-based.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const noop = async () => {};

describe('DriverForm – phone number validation', () => {
  const fillAndSubmit = async (phone: string) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DriverForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(document.querySelector('[name="first_name"]')!, 'Jan');
    await user.type(document.querySelector('[name="last_name"]')!, 'Kowalski');
    if (phone) await user.type(document.querySelector('[name="phone_number"]')!, phone);

    await user.click(screen.getByRole('button', { name: /addDriver/ }));

    return { onSubmit };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error for empty phone number', async () => {
    const user = userEvent.setup();
    render(<DriverForm onSubmit={noop} onCancel={vi.fn()} />);

    // Use name attribute selectors — reliable regardless of translated label text
    await user.type(document.querySelector('[name="first_name"]')!, 'Jan');
    await user.type(document.querySelector('[name="last_name"]')!, 'Kowalski');
    // leave phone empty

    await user.click(screen.getByRole('button', { name: /addDriver/ }));

    expect(screen.getByText('errors.phoneRequired')).toBeInTheDocument();
  });

  it('shows error when phone contains non-digit characters', async () => {
    await fillAndSubmit('48-12-345-678');
    expect(screen.getByText('errors.phoneDigitsOnly')).toBeInTheDocument();
  });

  it('shows error when phone does not start with 48', async () => {
    await fillAndSubmit('0048123456789');
    expect(screen.getByText('errors.phoneStartWith48')).toBeInTheDocument();
  });

  it('shows error when phone is shorter than 10 digits', async () => {
    await fillAndSubmit('481234');
    expect(screen.getByText('errors.phoneLength')).toBeInTheDocument();
  });

  it('shows error when phone is longer than 15 digits', async () => {
    await fillAndSubmit('4812345678901234'); // 16 digits
    expect(screen.getByText('errors.phoneLength')).toBeInTheDocument();
  });

  it('accepts a valid Polish phone number and calls onSubmit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DriverForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(document.querySelector('[name="first_name"]')!, 'Jan');
    await user.type(document.querySelector('[name="last_name"]')!, 'Kowalski');
    await user.type(document.querySelector('[name="phone_number"]')!, '48123456789');

    await user.click(screen.getByRole('button', { name: /addDriver/ }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith({
      first_name: 'Jan',
      last_name: 'Kowalski',
      phone_number: '48123456789',
    });
  });
});

describe('DriverForm – form behaviour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pre-fills inputs from initialData when editing a driver', () => {
    const existing: Driver = {
      id: 'd1',
      first_name: 'Anna',
      last_name: 'Nowak',
      phone_number: '48987654321',
      has_vehicle: false,
      is_active_driver: true,
      last_active_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    render(<DriverForm onSubmit={noop} onCancel={vi.fn()} initialData={existing} />);

    expect(screen.getByDisplayValue('Anna')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nowak')).toBeInTheDocument();
    expect(screen.getByDisplayValue('48987654321')).toBeInTheDocument();
  });

  it('shows "updateDriver" button text when editing', () => {
    const existing: Driver = {
      id: 'd1', first_name: 'A', last_name: 'B', phone_number: '48123456789',
      has_vehicle: false, is_active_driver: true, last_active_at: null,
      created_at: '', updated_at: '',
    };
    render(<DriverForm onSubmit={noop} onCancel={vi.fn()} initialData={existing} />);
    expect(screen.getByRole('button', { name: /updateDriver/ })).toBeInTheDocument();
  });

  it('shows "addDriver" button text for a new driver', () => {
    render(<DriverForm onSubmit={noop} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /addDriver/ })).toBeInTheDocument();
  });

  it('clears the first_name error as soon as the user starts typing', async () => {
    const user = userEvent.setup();
    render(<DriverForm onSubmit={noop} onCancel={vi.fn()} />);

    // Submit with empty first_name to trigger validation
    await user.click(screen.getByRole('button', { name: /addDriver/ }));
    expect(screen.getByText('errors.firstNameRequired')).toBeInTheDocument();

    // Start typing — error should disappear
    await user.type(document.querySelector('[name="first_name"]')!, 'J');
    expect(screen.queryByText('errors.firstNameRequired')).not.toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<DriverForm onSubmit={noop} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/ }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onSubmit when first_name is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<DriverForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /addDriver/ }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('maps backend field errors from array format onto correct fields', async () => {
    const user = userEvent.setup();
    const backendError = {
      response: {
        data: {
          phone_number: ['Цей номер вже використовується'],
        },
      },
    };
    const onSubmit = vi.fn().mockRejectedValue(backendError);
    render(<DriverForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(document.querySelector('[name="first_name"]')!, 'Jan');
    await user.type(document.querySelector('[name="last_name"]')!, 'Kowalski');
    await user.type(document.querySelector('[name="phone_number"]')!, '48123456789');
    await user.click(screen.getByRole('button', { name: /addDriver/ }));

    await waitFor(() =>
      expect(screen.getByText('Цей номер вже використовується')).toBeInTheDocument()
    );
  });
});
