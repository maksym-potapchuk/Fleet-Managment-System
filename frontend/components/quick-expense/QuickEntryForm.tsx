'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ExpenseCategory, QuickExpenseEntry, ExpensePart, ServiceItem, FuelType, WashType, PaymentMethod, PayerType, SupplierType } from '@/types/expense';
import { Service } from '@/types/service';
import { getAllServices } from '@/services/service';
import { FileInput } from '@/components/common/FileInput';
import { ChevronDown, ChevronUp, Plus, Check, Trash2 } from 'lucide-react';

const FUEL_TYPES: { value: FuelType; short: string }[] = [
  { value: 'GASOLINE', short: 'B' },
  { value: 'DIESEL', short: 'D' },
  { value: 'LPG', short: 'G' },
  { value: 'ELECTRIC', short: 'E' },
];

const WASH_TYPES: { value: WashType; short: string }[] = [
  { value: 'EXTERIOR', short: 'ext' },
  { value: 'INTERIOR', short: 'int' },
  { value: 'FULL', short: 'full' },
];

const PAYMENT_METHODS: { value: PaymentMethod; short: string }[] = [
  { value: 'CASHLESS', short: 'card' },
  { value: 'CASH', short: 'cash' },
];

const PAYER_TYPES_OPTIONS: { value: PayerType; short: string }[] = [
  { value: 'COMPANY', short: 'firm' },
  { value: 'CLIENT', short: 'client' },
];

const SUPPLIER_TYPES_OPTIONS: { value: SupplierType; short: string }[] = [
  { value: 'DISASSEMBLY', short: 'dis' },
  { value: 'INDIVIDUAL', short: 'ind' },
];

const emptyPart = (): ExpensePart => ({ name: '', quantity: 1, unit_price: '' });
const emptyServiceItem = (): ServiceItem => ({ name: '', price: '' });

interface QuickEntryFormProps {
  categories: ExpenseCategory[];
  activeCategoryId: string;
  editingEntry?: QuickExpenseEntry;
  onAdd: (entry: QuickExpenseEntry) => void;
  onCancel: () => void;
  tExpenses: (key: string) => string;
  t: (key: string) => string;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  renderLabel,
}: {
  options: { value: T; short: string }[];
  value: T | undefined;
  onChange: (val: T) => void;
  renderLabel: (opt: { value: T; short: string }) => string;
}) {
  return (
    <div className="flex gap-1 sm:gap-1.5 p-1 bg-slate-100 rounded-xl overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`
            flex-1 min-w-0 min-h-[44px] sm:min-h-0 py-2.5 sm:py-2.5 px-1 sm:px-2 rounded-lg
            text-[11px] sm:text-xs font-bold select-none truncate
            transition-[color,background-color,box-shadow,transform] duration-150
            ${value === opt.value
              ? 'bg-teal-600 text-white shadow-sm scale-[1.02]'
              : 'bg-transparent text-slate-500 hover:text-slate-700 hover:bg-white/60 active:scale-[0.97]'
            }
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40
          `}
        >
          {renderLabel(opt)}
        </button>
      ))}
    </div>
  );
}

/* Numeric text input — uses type="text" + inputMode="decimal" to avoid cursor jumping */
function NumericInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
  label,
  required,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  label?: string;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      // Delay focus to avoid scroll jumps on mobile
      const timer = setTimeout(() => ref.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits, single dot, single comma — replace comma with dot
    const cleaned = raw.replace(',', '.');
    if (cleaned === '' || /^\d*\.?\d*$/.test(cleaned)) {
      onChange(cleaned);
    }
  };

  return (
    <div>
      {label && <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}{required && ' *'}</label>}
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}

export function QuickEntryForm({
  categories,
  activeCategoryId,
  editingEntry,
  onAdd,
  onCancel,
  tExpenses,
  t,
}: QuickEntryFormProps) {
  const category = categories.find(c => c.id === activeCategoryId);
  const code = category?.code || null;
  const isAutoAmount = code === 'SERVICE' || code === 'PARTS' || code === 'INSPECTION' || code === 'ACCESSORIES' || code === 'DOCUMENTS';

  // ── Base fields ──
  const [amount, setAmount] = useState(editingEntry?.amount || '');
  const [expenseDate, setExpenseDate] = useState(editingEntry?.expense_date || new Date().toISOString().split('T')[0]);
  const [showDate, setShowDate] = useState(false);

  // ── Payment & payer ──
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editingEntry?.payment_method || 'CASHLESS');
  const [payerType, setPayerType] = useState<PayerType>(editingEntry?.payer_type || 'COMPANY');
  const [expenseFor, setExpenseFor] = useState(editingEntry?.expense_for || '');

  // ── PARTS detail ──
  const [sourceName, setSourceName] = useState(editingEntry?.source_name || '');
  const [supplierType, setSupplierType] = useState<SupplierType>(editingEntry?.supplier_type || 'DISASSEMBLY');

  // ── FUEL ──
  const [liters, setLiters] = useState(editingEntry?.liters || '');
  const [fuelType, setFuelType] = useState<FuelType | undefined>(editingEntry?.fuel_type);
  const [receiptFile, setReceiptFile] = useState<File | null>(editingEntry?.receipt || null);

  // ── WASHING ──
  const [washType, setWashType] = useState<WashType | undefined>(editingEntry?.wash_type);

  // ── FINES ──
  const [violationType, setViolationType] = useState(editingEntry?.violation_type || '');
  const [fineNumber, setFineNumber] = useState(editingEntry?.fine_number || '');
  const [fineDate, setFineDate] = useState(editingEntry?.fine_date || '');

  // ── INSPECTION ──
  const [inspectionDate, setInspectionDate] = useState(editingEntry?.inspection_date || '');
  const [officialCost, setOfficialCost] = useState(editingEntry?.official_cost || '');
  const [additionalCost, setAdditionalCost] = useState(editingEntry?.additional_cost || '');
  const [nextInspectionDate, setNextInspectionDate] = useState(editingEntry?.next_inspection_date || '');

  // Auto-compute next inspection date (+1 year) when inspectionDate changes
  useEffect(() => {
    if (code === 'INSPECTION' && inspectionDate && !editingEntry?.next_inspection_date) {
      const d = new Date(inspectionDate);
      d.setFullYear(d.getFullYear() + 1);
      setNextInspectionDate(d.toISOString().split('T')[0]);
    }
  }, [inspectionDate, code]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SERVICE ──
  const [selectedService, setSelectedService] = useState(editingEntry?.service || '');
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(
    editingEntry?.service_items?.length ? editingEntry.service_items : [emptyServiceItem()],
  );
  const [invoiceFile, setInvoiceFile] = useState<File | null>(editingEntry?.invoice_files?.[0] || null);
  const [fleetServices, setFleetServices] = useState<Service[]>([]);

  // ── PARTS ──
  const [parts, setParts] = useState<ExpensePart[]>(
    editingEntry?.parts?.length ? editingEntry.parts : [emptyPart()],
  );

  // Load fleet services for SERVICE category
  useEffect(() => {
    if (code !== 'SERVICE') return;
    let ignore = false;
    getAllServices()
      .then(services => { if (!ignore) setFleetServices(services); })
      .catch(() => {});
    return () => { ignore = true; };
  }, [code]);

  // ── Computed totals ──
  const serviceTotal = serviceItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const partsTotal = parts.reduce((sum, p) => sum + (parseFloat(p.unit_price as string) || 0) * (p.quantity || 1), 0);
  const inspectionTotal = (parseFloat(officialCost) || 0) + (parseFloat(additionalCost) || 0);

  // ── Service item handlers (stable references) ──
  const updateServiceItem = useCallback((idx: number, field: keyof ServiceItem, value: string) => {
    setServiceItems(prev => prev.map((si, i) => i === idx ? { ...si, [field]: value } : si));
  }, []);

  const removeServiceItem = useCallback((idx: number) => {
    setServiceItems(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Parts handlers (stable references) ──
  const updatePart = useCallback((idx: number, field: string, value: string | number) => {
    setParts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }, []);

  const removePart = useCallback((idx: number) => {
    setParts(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Validation ──
  const isValid = useMemo(() => {
    if (code === 'INSPECTION') return parseFloat(officialCost) > 0 && inspectionDate;
    if (code === 'SERVICE') return serviceItems.some(i => i.name.trim() && parseFloat(i.price) > 0);
    if (code === 'PARTS' || code === 'ACCESSORIES' || code === 'DOCUMENTS') return parts.some(p => p.name.trim() && parseFloat(p.unit_price as string) > 0);
    if (!amount || parseFloat(amount) <= 0) return false;
    if (code === 'FUEL' && (!liters || !fuelType)) return false;
    if (code === 'WASHING' && !washType) return false;
    if (code === 'FINES' && !violationType.trim()) return false;
    return true;
  }, [amount, code, liters, fuelType, washType, violationType, officialCost, inspectionDate, serviceItems, parts]);

  if (!category) return null;

  const handleSubmit = () => {
    if (!isValid) return;

    let computedAmount = amount;
    if (code === 'SERVICE') computedAmount = String(serviceTotal);
    else if (code === 'PARTS' || code === 'ACCESSORIES' || code === 'DOCUMENTS') computedAmount = String(partsTotal);
    else if (code === 'INSPECTION') computedAmount = String(inspectionTotal);

    const entry: QuickExpenseEntry = {
      id: editingEntry?.id || crypto.randomUUID(),
      category: category.id,
      category_code: code,
      category_name: code ? tExpenses(`types.${code}`) : category.name,
      category_icon: category.icon,
      category_color: category.color,
      amount: computedAmount,
      expense_date: expenseDate,
      payment_method: paymentMethod,
      payer_type: payerType,
    };

    if (code === 'FUEL') {
      entry.liters = liters;
      entry.fuel_type = fuelType;
      if (receiptFile) entry.receipt = receiptFile;
    } else if (code === 'WASHING') {
      entry.wash_type = washType;
    } else if (code === 'FINES') {
      entry.violation_type = violationType;
      if (fineNumber) entry.fine_number = fineNumber;
      if (fineDate) entry.fine_date = fineDate;
    } else if (code === 'INSPECTION') {
      entry.official_cost = officialCost;
      entry.additional_cost = additionalCost;
      entry.inspection_date = inspectionDate || expenseDate;
      if (nextInspectionDate) entry.next_inspection_date = nextInspectionDate;
    } else if (code === 'SERVICE') {
      if (selectedService) entry.service = selectedService;
      entry.service_items = serviceItems.filter(i => i.name.trim());
      if (invoiceFile) entry.invoice_files = [invoiceFile];
    } else if (code === 'PARTS') {
      entry.source_name = sourceName;
      entry.supplier_type = supplierType;
      entry.parts = parts.filter(p => p.name.trim());
      if (invoiceFile) entry.invoice_files = [invoiceFile];
    } else if (code === 'ACCESSORIES' || code === 'DOCUMENTS') {
      entry.parts = parts.filter(p => p.name.trim());
      if (invoiceFile) entry.invoice_files = [invoiceFile];
    } else if (code === 'OTHER') {
      if (expenseFor) entry.expense_for = expenseFor;
    }

    onAdd(entry);
  };

  const inputClasses = 'w-full px-3 py-2.5 min-h-[44px] sm:min-h-0 border border-slate-200 rounded-xl text-sm text-slate-900 bg-white placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-[border-color,box-shadow] duration-150';
  const labelClasses = 'block text-xs font-medium text-slate-500 mb-1.5';

  return (
    <div className="py-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <form
        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Category header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: category.color }} />
            <h4 className="text-sm font-bold text-slate-800">
              {code ? tExpenses(`types.${code}`) : category.name}
            </h4>
          </div>
          <button type="button" onClick={onCancel} className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors underline-offset-2 hover:underline py-1 px-2 -mr-2 rounded-lg">
            {t('addStep.selectCategory')}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount (not for auto-computed categories) */}
          {!isAutoAmount && (
            <NumericInput
              value={amount}
              onChange={setAmount}
              placeholder="0.00 PLN"
              autoFocus
              label={`${t('addStep.amount')} *`}
              className={inputClasses}
            />
          )}

          {/* ── Payment & payer ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClasses}>{tExpenses('fields.paymentMethod')}</label>
              <div className="pt-0.5">
                <SegmentedControl
                  options={PAYMENT_METHODS}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  renderLabel={(opt) => tExpenses(`paymentMethods.${opt.value}`)}
                />
              </div>
            </div>
            <div>
              <label className={labelClasses}>{tExpenses('fields.payerType')}</label>
              <div className="pt-0.5">
                <SegmentedControl
                  options={PAYER_TYPES_OPTIONS}
                  value={payerType}
                  onChange={setPayerType}
                  renderLabel={(opt) => tExpenses(`payerTypes.${opt.value}`)}
                />
              </div>
            </div>
          </div>

          {/* ── FUEL ── */}
          {code === 'FUEL' && (
            <>
              <NumericInput
                value={liters}
                onChange={setLiters}
                placeholder="0.00"
                label={`${tExpenses('fields.liters')} *`}
                className={inputClasses}
              />
              <div>
                <label className={labelClasses}>{tExpenses('fields.fuelType')} *</label>
                <div className="pt-0.5">
                  <SegmentedControl
                    options={FUEL_TYPES}
                    value={fuelType}
                    onChange={setFuelType}
                    renderLabel={(opt) => tExpenses(`fuelTypes.${opt.value}`)}
                  />
                </div>
              </div>
              <FileInput
                label={tExpenses('fields.receipt')}
                onChange={(f) => setReceiptFile(f)}
                disabled={false}
              />
            </>
          )}

          {/* ── WASHING ── */}
          {code === 'WASHING' && (
            <div>
              <label className={labelClasses}>{tExpenses('fields.washType')} *</label>
              <SegmentedControl
                options={WASH_TYPES}
                value={washType}
                onChange={setWashType}
                renderLabel={(opt) => tExpenses(`washTypes.${opt.value}`)}
              />
            </div>
          )}

          {/* ── FINES ── */}
          {code === 'FINES' && (
            <>
              <div>
                <label className={labelClasses}>{tExpenses('fields.violationType')} *</label>
                <input
                  type="text"
                  value={violationType}
                  onChange={(e) => setViolationType(e.target.value)}
                  placeholder={tExpenses('fields.violationType')}
                  className={inputClasses}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>{tExpenses('fields.fineNumber')}</label>
                  <input
                    type="text"
                    value={fineNumber}
                    onChange={(e) => setFineNumber(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>{tExpenses('fields.fineDate')}</label>
                  <input
                    type="date"
                    value={fineDate}
                    onChange={(e) => setFineDate(e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── INSPECTION ── */}
          {code === 'INSPECTION' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>{tExpenses('fields.inspectionDate')} *</label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>{tExpenses('fields.nextInspectionDate')}</label>
                  <input
                    type="date"
                    value={nextInspectionDate}
                    onChange={(e) => setNextInspectionDate(e.target.value)}
                    className={inputClasses}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumericInput
                  value={officialCost}
                  onChange={setOfficialCost}
                  placeholder="0.00"
                  autoFocus={!editingEntry}
                  label={`${tExpenses('fields.officialCost')} *`}
                  className={inputClasses}
                />
                <NumericInput
                  value={additionalCost}
                  onChange={setAdditionalCost}
                  placeholder="0.00"
                  label={tExpenses('fields.additionalCost')}
                  className={inputClasses}
                />
              </div>
              {inspectionTotal > 0 && (
                <div className="text-right">
                  <span className="text-sm font-semibold text-teal-700 tabular-nums bg-teal-50 px-3 py-1.5 rounded-lg inline-block">
                    = {inspectionTotal.toFixed(2)} PLN
                  </span>
                </div>
              )}
            </>
          )}

          {/* ── SERVICE ── */}
          {code === 'SERVICE' && (
            <>
              <div>
                <label className={labelClasses}>{tExpenses('fields.selectService')}</label>
                <div className="relative">
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className={`${inputClasses} appearance-none pr-9`}
                  >
                    <option value="">--</option>
                    {fleetServices.map(svc => <option key={svc.id} value={svc.id}>{svc.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClasses + ' mb-0'}>{tExpenses('fields.serviceItems')}</label>
                  <button
                    type="button"
                    onClick={() => setServiceItems(prev => [...prev, emptyServiceItem()])}
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-all duration-150 hover:gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> {tExpenses('fields.addServiceItem')}
                  </button>
                </div>
                <div className="space-y-2">
                  {serviceItems.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 transition-all duration-150 hover:border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">#{idx + 1}</span>
                        {serviceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeServiceItem(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-all duration-150 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-[1fr,100px] gap-2">
                        <input
                          type="text"
                          placeholder={tExpenses('fields.serviceName')}
                          value={item.name}
                          onChange={(e) => updateServiceItem(idx, 'name', e.target.value)}
                          className={inputClasses}
                        />
                        <NumericInput
                          value={item.price}
                          onChange={(val) => updateServiceItem(idx, 'price', val)}
                          placeholder="PLN"
                          className={inputClasses}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {serviceTotal > 0 && (
                  <div className="mt-2 text-right text-sm font-semibold text-teal-700 tabular-nums bg-teal-50 px-3 py-1.5 rounded-lg inline-block float-right">
                    = {serviceTotal.toFixed(2)} PLN
                  </div>
                )}
                <div className="clear-both" />
              </div>

              <FileInput
                label={tExpenses('fields.invoice')}
                required
                onChange={(f) => setInvoiceFile(f)}
                disabled={false}
              />
            </>
          )}

          {/* ── PARTS ── */}
          {code === 'PARTS' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses}>{tExpenses('fields.sourceName')}</label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="Allegro, OLX..."
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>{tExpenses('fields.supplierType')}</label>
                  <div className="pt-0.5">
                    <SegmentedControl
                      options={SUPPLIER_TYPES_OPTIONS}
                      value={supplierType}
                      onChange={setSupplierType}
                      renderLabel={(opt) => tExpenses(`supplierTypes.${opt.value}`)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClasses + ' mb-0'}>{tExpenses('fields.partName')}</label>
                  <button
                    type="button"
                    onClick={() => setParts(prev => [...prev, emptyPart()])}
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-all duration-150 hover:gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> {tExpenses('fields.addPart')}
                  </button>
                </div>
                <div className="space-y-2">
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 transition-all duration-150 hover:border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">#{idx + 1}</span>
                        {parts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePart(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-all duration-150 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={tExpenses('fields.partName')}
                        value={part.name}
                        onChange={(e) => updatePart(idx, 'name', e.target.value)}
                        className={inputClasses}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">{tExpenses('fields.quantity')}</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="1"
                            value={part.quantity}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              updatePart(idx, 'quantity', parseInt(val, 10) || 1);
                            }}
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">{tExpenses('fields.unitPrice')}</label>
                          <NumericInput
                            value={part.unit_price as string}
                            onChange={(val) => updatePart(idx, 'unit_price', val)}
                            placeholder="0.00 PLN"
                            className={inputClasses}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {partsTotal > 0 && (
                  <div className="mt-2 text-right">
                    <span className="text-sm font-semibold text-teal-700 tabular-nums bg-teal-50 px-3 py-1.5 rounded-lg inline-block">
                      = {partsTotal.toFixed(2)} PLN
                    </span>
                  </div>
                )}
              </div>

              <FileInput
                label={tExpenses('fields.invoice')}
                onChange={(f) => setInvoiceFile(f)}
                disabled={false}
              />
            </>
          )}

          {/* ── ACCESSORIES / DOCUMENTS ── */}
          {(code === 'ACCESSORIES' || code === 'DOCUMENTS') && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClasses + ' mb-0'}>{tExpenses('fields.itemName')}</label>
                  <button
                    type="button"
                    onClick={() => setParts(prev => [...prev, emptyPart()])}
                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-all duration-150 hover:gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> {tExpenses('fields.addItem')}
                  </button>
                </div>
                <div className="space-y-2">
                  {parts.map((part, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 transition-all duration-150 hover:border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">#{idx + 1}</span>
                        {parts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePart(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-all duration-150 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder={tExpenses('fields.itemName')}
                        value={part.name}
                        onChange={(e) => updatePart(idx, 'name', e.target.value)}
                        className={inputClasses}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">{tExpenses('fields.quantity')}</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="1"
                            value={part.quantity}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              updatePart(idx, 'quantity', parseInt(val, 10) || 1);
                            }}
                            className={inputClasses}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">{tExpenses('fields.unitPrice')}</label>
                          <NumericInput
                            value={part.unit_price as string}
                            onChange={(val) => updatePart(idx, 'unit_price', val)}
                            placeholder="0.00 PLN"
                            className={inputClasses}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {partsTotal > 0 && (
                  <div className="mt-2 text-right">
                    <span className="text-sm font-semibold text-teal-700 tabular-nums bg-teal-50 px-3 py-1.5 rounded-lg inline-block">
                      = {partsTotal.toFixed(2)} PLN
                    </span>
                  </div>
                )}
              </div>

              <FileInput
                label={tExpenses('fields.invoice')}
                onChange={(f) => setInvoiceFile(f)}
                disabled={false}
              />
            </>
          )}

          {/* ── OTHER ── */}
          {code === 'OTHER' && (
            <div>
              <label className={labelClasses}>{tExpenses('fields.expenseName')}</label>
              <input
                type="text"
                value={expenseFor}
                onChange={(e) => setExpenseFor(e.target.value)}
                placeholder={tExpenses('fields.expenseNamePlaceholder')}
                className={inputClasses}
              />
            </div>
          )}

          {/* Date (collapsible) */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDate(!showDate)}
              className="flex items-center gap-1.5 text-xs text-slate-500 font-medium py-1.5 px-1 -mx-1 rounded-lg transition-colors hover:text-slate-700 hover:bg-slate-50"
            >
              {showDate ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {t('addStep.date')}: <span className="text-slate-700 font-semibold">{expenseDate}</span>
            </button>
            {showDate && (
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className={`${inputClasses} mt-2`}
              />
            )}
          </div>

          {/* Add / Update button */}
          <button
            type="submit"
            disabled={!isValid}
            className={`
              w-full flex items-center justify-center gap-2 py-3 min-h-[48px] sm:min-h-0 rounded-xl font-bold text-sm transition-all duration-150
              ${isValid
                ? 'bg-gradient-to-r from-[#2D8B7E] to-[#246f65] text-white shadow-sm hover:shadow-md hover:brightness-105 active:scale-[0.98] active:shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
              }
            `}
          >
            {editingEntry ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingEntry ? tExpenses('editExpense') : t('addStep.addEntry')}
          </button>
        </div>
      </form>
    </div>
  );
}
