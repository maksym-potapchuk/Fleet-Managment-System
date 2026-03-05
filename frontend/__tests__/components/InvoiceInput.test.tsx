import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvoiceInput } from '@/components/expense/InvoiceInput';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/services/expense', () => ({
  expenseService: {
    searchInvoices: vi.fn(),
  },
}));

import { expenseService } from '@/services/expense';
const mockedSearch = expenseService.searchInvoices as ReturnType<typeof vi.fn>;

const defaultProps = {
  invoiceNumber: '',
  onNumberChange: vi.fn(),
  foundInvoice: null,
  onInvoiceFound: vi.fn(),
  file: null,
  onFileChange: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('InvoiceInput', () => {
  it('renders upload button when no file selected', () => {
    render(<InvoiceInput {...defaultProps} />);
    expect(screen.getByText('uploadFile')).toBeInTheDocument();
  });

  it('renders found invoice banner when foundInvoice is set', () => {
    const foundInvoice = {
      id: 'inv-1',
      number: 'FAK-123',
      vendor_name: 'AutoParts',
      invoice_date: null,
      total_amount: null,
      expense_count: 2,
    };
    render(<InvoiceInput {...defaultProps} foundInvoice={foundInvoice} />);
    expect(screen.getByText(/found/)).toBeInTheDocument();
    expect(screen.getByText(/FAK-123/)).toBeInTheDocument();
  });

  it('shows file info after file is selected', () => {
    const file = new File(['content'], 'Faktura-2026-001.pdf', { type: 'application/pdf' });
    render(<InvoiceInput {...defaultProps} file={file} invoiceNumber="Faktura-2026-001" />);
    expect(screen.getByText('Faktura-2026-001.pdf')).toBeInTheDocument();
  });

  it('extracts invoice number from filename on file select', async () => {
    mockedSearch.mockResolvedValueOnce([]);
    const onNumberChange = vi.fn();
    const onFileChange = vi.fn();

    render(
      <InvoiceInput
        {...defaultProps}
        onNumberChange={onNumberChange}
        onFileChange={onFileChange}
      />,
    );

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf'], 'Receipt_2193 2246_4202.pdf', { type: 'application/pdf' });
    fireEvent.change(hiddenInput, { target: { files: [file] } });

    expect(onFileChange).toHaveBeenCalledWith(file);
    expect(onNumberChange).toHaveBeenCalledWith('Receipt-2193-2246-4202');
  });

  it('calls searchInvoices after file is selected', async () => {
    mockedSearch.mockResolvedValueOnce([]);

    render(<InvoiceInput {...defaultProps} />);

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf'], 'FAK-100.pdf', { type: 'application/pdf' });
    fireEvent.change(hiddenInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockedSearch).toHaveBeenCalledWith('FAK-100');
    });
  });

  it('calls onInvoiceFound when search returns results', async () => {
    const match = {
      id: 'inv-1',
      number: 'FAK-100',
      vendor_name: 'Test',
      invoice_date: null,
      total_amount: null,
      expense_count: 1,
    };
    mockedSearch.mockResolvedValueOnce([match]);
    const onInvoiceFound = vi.fn();

    render(<InvoiceInput {...defaultProps} onInvoiceFound={onInvoiceFound} />);

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf'], 'FAK-100.pdf', { type: 'application/pdf' });
    fireEvent.change(hiddenInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(onInvoiceFound).toHaveBeenCalledWith(match);
    });
  });

  it('clears all state when clear button is clicked', () => {
    const foundInvoice = {
      id: 'inv-1',
      number: 'FAK-123',
      vendor_name: '',
      invoice_date: null,
      total_amount: null,
      expense_count: 0,
    };
    const onNumberChange = vi.fn();
    const onInvoiceFound = vi.fn();
    const onFileChange = vi.fn();

    render(
      <InvoiceInput
        {...defaultProps}
        foundInvoice={foundInvoice}
        onNumberChange={onNumberChange}
        onInvoiceFound={onInvoiceFound}
        onFileChange={onFileChange}
      />,
    );

    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);

    expect(onNumberChange).toHaveBeenCalledWith('');
    expect(onInvoiceFound).toHaveBeenCalledWith(null);
    expect(onFileChange).toHaveBeenCalledWith(null);
  });
});
