'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, X } from 'lucide-react';

interface FileInputProps {
  label: string;
  required?: boolean;
  accept?: string;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  hasError?: boolean;
}

export function FileInput({ label, required, accept = '.pdf,.jpg,.jpeg,.png', disabled, onChange, hasError }: FileInputProps) {
  const t = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFileName(file?.name || null);
    onChange(file);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && ' *'}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`
          group w-full flex items-center gap-3 px-3 py-2.5 border border-dashed rounded-xl text-sm text-left
          transition-all duration-150
          ${hasError ? 'border-red-500' : 'border-slate-300'}
          ${disabled
            ? 'bg-slate-100 cursor-not-allowed'
            : 'cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 hover:shadow-sm active:scale-[0.99]'
          }
        `}
      >
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 ${disabled ? 'bg-slate-200' : 'bg-slate-100 group-hover:bg-teal-100'}`}>
          <Upload className={`w-4 h-4 transition-colors duration-150 ${disabled ? 'text-slate-400' : 'text-slate-500 group-hover:text-teal-600'}`} />
        </div>
        <span className={`flex-1 truncate ${fileName ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {fileName || t('chooseFile')}
        </span>
        {fileName && (
          <span onClick={handleClear} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-150 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>
    </div>
  );
}
