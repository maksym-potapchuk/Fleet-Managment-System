'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Check, X, Loader2, Upload, Image } from 'lucide-react';
import { expenseService } from '@/services/expense';
import { InvoiceSearchResult } from '@/types/expense';

interface InvoiceInputProps {
  invoiceNumber: string;
  onNumberChange: (number: string) => void;
  foundInvoice: InvoiceSearchResult | null;
  onInvoiceFound: (invoice: InvoiceSearchResult | null) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  required?: boolean;
  disabled?: boolean;
  hasError?: boolean;
}

function extractInvoiceNumber(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, '');
  return name.replace(/[_\s]+/g, '-');
}

export function InvoiceInput({
  invoiceNumber,
  onNumberChange,
  foundInvoice,
  onInvoiceFound,
  file,
  onFileChange,
  required,
  disabled,
  hasError,
}: InvoiceInputProps) {
  const t = useTranslations('expenses.invoice');
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchByNumber = useCallback(async (number: string) => {
    if (number.length < 2) return;
    setSearching(true);
    try {
      const results = await expenseService.searchInvoices(number);
      if (results.length > 0) {
        onInvoiceFound(results[0]);
      }
    } catch {
      // Search failed — treat as new invoice
    } finally {
      setSearching(false);
      setSearchDone(true);
    }
  }, [onInvoiceFound]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    if (!selected) return;

    onFileChange(selected);
    onInvoiceFound(null);
    setSearchDone(false);

    const number = extractInvoiceNumber(selected.name);
    onNumberChange(number);
    searchByNumber(number);
  };

  const handleClear = () => {
    onNumberChange('');
    onInvoiceFound(null);
    onFileChange(null);
    setSearchDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    return () => setSearching(false);
  }, []);

  // Found existing invoice — green banner
  if (foundInvoice) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t('number')}{required && ' *'}
        </label>
        <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 truncate">
              {t('found')} — {foundInvoice.number}
            </p>
            <p className="text-xs text-emerald-600 truncate">
              {[
                foundInvoice.vendor_name,
                foundInvoice.expense_count > 0 && `${foundInvoice.expense_count} ${t('linkedExpenses')}`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-emerald-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-150"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {t('number')}{required && ' *'}
      </label>

      {/* File selected — show file info + searching state */}
      {file ? (
        <div className="space-y-2">
          <div className={`flex items-center gap-3 px-3 py-2.5 border rounded-xl ${hasError ? 'border-red-500' : 'border-slate-300'}`}>
            {file.type.startsWith('image/') ? (
              <Image className="w-4 h-4 text-[#2D8B7E] flex-shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-[#2D8B7E] flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
              {searching ? (
                <p className="text-xs text-teal-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t('searching')}
                </p>
              ) : searchDone ? (
                <p className="text-xs text-slate-500">{invoiceNumber}</p>
              ) : null}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* No file — show upload button */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className={`
            w-full flex items-center gap-3 px-3 py-3 border-2 border-dashed rounded-xl
            transition-colors cursor-pointer
            ${hasError ? 'border-red-300 bg-red-50/50' : 'border-slate-300 hover:border-teal-400 hover:bg-teal-50/30'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Upload className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">{t('uploadFile')}</span>
          <span className="text-xs text-slate-400 ml-auto">.pdf, .doc, .jpg, .png</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
