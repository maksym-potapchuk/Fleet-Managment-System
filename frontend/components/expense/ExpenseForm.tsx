'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Expense, CreateExpenseData, ExpenseCategory, ExpensePart, ServiceItem, FuelType, WashType, PaymentMethod, PayerType, SupplierType, InvoiceSearchResult } from '@/types/expense';
import { Service } from '@/types/service';
import { Vehicle } from '@/types/vehicle';
import { getAllServices } from '@/services/service';
import { VehicleAutocomplete } from '@/components/expense/VehicleAutocomplete';
import { FileInput } from '@/components/common/FileInput';
import { InvoiceInput } from '@/components/expense/InvoiceInput';
import { Plus, Trash2, Check, AlertCircle } from 'lucide-react';

interface ExpenseFormProps {
  onSubmit: (data: CreateExpenseData) => Promise<void>;
  onCancel: () => void;
  categories: ExpenseCategory[];
  initialData?: Expense | null;
  isLoading?: boolean;
  vehicleId?: string;
  vehicles?: Vehicle[];
  vehicleDriver?: { id: string; first_name: string; last_name: string } | null;
}

const FUEL_TYPES: FuelType[] = ['GASOLINE', 'DIESEL', 'LPG', 'ELECTRIC'];
const WASH_TYPES: WashType[] = ['EXTERIOR', 'INTERIOR', 'FULL'];
const PAYMENT_METHODS: PaymentMethod[] = ['CASHLESS', 'CASH'];
const PAYER_TYPES: PayerType[] = ['COMPANY', 'CLIENT'];
const SUPPLIER_TYPES: SupplierType[] = ['DISASSEMBLY', 'INDIVIDUAL', 'SHOP'];

const emptyPart = (): ExpensePart => ({ name: '', quantity: 1, unit_price: '' });
const emptyServiceItem = (): ServiceItem => ({ name: '', price: '' });

export function ExpenseForm({ onSubmit, onCancel, categories, initialData, isLoading = false, vehicleId, vehicles, vehicleDriver: vehicleDriverProp }: ExpenseFormProps) {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');

  const [formData, setFormData] = useState<Record<string, string>>({
    vehicle: initialData?.vehicle || vehicleId || '',
    category: initialData?.category || '',
    amount: initialData?.amount || '',
    expense_date: initialData?.expense_date?.slice(0, 16) || new Date().toISOString().slice(0, 16),
    // Payment & payer
    payment_method: initialData?.payment_method || 'CASHLESS',
    payer_type: initialData?.payer_type || 'COMPANY',
    expense_for: initialData?.expense_for || '',
    // PARTS detail
    source_name: initialData?.source_name || '',
    supplier_type: initialData?.supplier_type || 'DISASSEMBLY',
    // SERVICE
    service: initialData?.service?.toString() || '',
    // WASHING
    wash_type: initialData?.wash_type || '',
    // FINES
    fine_number: initialData?.fine_number || '',
    violation_type: initialData?.violation_type || '',
    fine_date: initialData?.fine_date || '',
    driver_at_time: initialData?.driver_at_time || '',
    // INSPECTION
    inspection_date: initialData?.inspection_date || '',
    official_cost: initialData?.official_cost || '',
    additional_cost: initialData?.additional_cost || '',
    next_inspection_date: initialData?.next_inspection_date || '',
  });

  const [fuelTypes, setFuelTypes] = useState<FuelType[]>(initialData?.fuel_types?.length ? initialData.fuel_types : []);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoice_data?.number || '');
  const [foundInvoice, setFoundInvoice] = useState<InvoiceSearchResult | null>(null);
  const [parts, setParts] = useState<ExpensePart[]>(initialData?.parts?.length ? initialData.parts : [emptyPart()]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(initialData?.service_items?.length ? initialData.service_items : [emptyServiceItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fleetServices, setFleetServices] = useState<Service[]>([]);
  const [clientDriver, setClientDriver] = useState(initialData?.client_driver || '');
  const [excludeFromCost, setExcludeFromCost] = useState(initialData?.exclude_from_cost || false);
  const [splitMode, setSplitMode] = useState<'PLN' | '%'>('PLN');
  const [companyAmount, setCompanyAmount] = useState(initialData?.company_amount || '');
  const [clientAmount, setClientAmount] = useState(initialData?.client_amount || '');
  const [clientPercent, setClientPercent] = useState('');

  const selectedCategory = categories.find(c => c.id === formData.category);
  const categoryCode = selectedCategory?.code || null;
  const isAutoAmountCategory = categoryCode === 'SERVICE' || categoryCode === 'PARTS' || categoryCode === 'INSPECTION' || categoryCode === 'ACCESSORIES' || categoryCode === 'DOCUMENTS';

  // Resolve driver: prop (vehicle detail page) or from selected vehicle (expenses page)
  const selectedVehicle = vehicles?.find(v => v.id === formData.vehicle);
  const resolvedDriver = vehicleDriverProp !== undefined ? vehicleDriverProp : (selectedVehicle?.driver ?? null);
  const resolvedDriverLabel = resolvedDriver ? `${resolvedDriver.first_name} ${resolvedDriver.last_name}` : null;

  // When vehicle or driver changes and payer is CLIENT, auto-update driver
  useEffect(() => {
    if (formData.payer_type === 'CLIENT') {
      setClientDriver(resolvedDriver ? String(resolvedDriver.id) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.vehicle, resolvedDriver?.id]);

  // Load fleet services on mount
  useEffect(() => {
    let ignore = false;
    getAllServices()
      .then(services => { if (!ignore) setFleetServices(services); })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'payer_type' && value === 'CLIENT') {
      if (resolvedDriver) {
        setClientDriver(String(resolvedDriver.id));
      }
    }
    if (name === 'payer_type' && value === 'COMPANY') {
      setClientDriver('');
      setCompanyAmount('');
      setClientAmount('');
      setClientPercent('');
      setExcludeFromCost(false);
    }

    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // Auto-compute next_inspection_date (+1 year) when inspection_date changes
      if (name === 'inspection_date' && value && categoryCode === 'INSPECTION' && !initialData?.next_inspection_date) {
        const d = new Date(value);
        d.setFullYear(d.getFullYear() + 1);
        next.next_inspection_date = d.toISOString().split('T')[0];
      }
      return next;
    });
    if (errors[name]) {
      setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  // Parts handlers
  const handlePartChange = (index: number, field: keyof ExpensePart, value: string | number) => {
    setParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };
  const addPart = () => setParts(prev => [...prev, emptyPart()]);
  const removePart = (index: number) => setParts(prev => prev.filter((_, i) => i !== index));

  // Service item handlers
  const handleServiceItemChange = (index: number, field: keyof ServiceItem, value: string) => {
    setServiceItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  const addServiceItem = () => setServiceItems(prev => [...prev, emptyServiceItem()]);
  const removeServiceItem = (index: number) => setServiceItems(prev => prev.filter((_, i) => i !== index));

  // Computed totals for SERVICE and PARTS
  const serviceTotal = serviceItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const partsTotal = parts.reduce((sum, p) => sum + (parseFloat(p.unit_price as string) || 0) * (p.quantity || 1), 0);
  const inspectionTotal = (parseFloat(formData.official_cost) || 0) + (parseFloat(formData.additional_cost) || 0);

  // Total amount for split validation
  const totalAmount = useMemo(() => {
    if (categoryCode === 'SERVICE') return serviceTotal;
    if (categoryCode === 'PARTS' || categoryCode === 'ACCESSORIES' || categoryCode === 'DOCUMENTS') return partsTotal;
    if (categoryCode === 'INSPECTION') return inspectionTotal;
    return parseFloat(formData.amount) || 0;
  }, [categoryCode, serviceTotal, partsTotal, inspectionTotal, formData.amount]);

  const isClientPayer = formData.payer_type === 'CLIENT';

  // Split amounts validation
  const splitSum = (parseFloat(companyAmount) || 0) + (parseFloat(clientAmount) || 0);
  const splitValid = !isClientPayer || (totalAmount > 0 && Math.abs(splitSum - totalAmount) < 0.01);

  // Handle % → PLN conversion
  const handlePercentChange = (pct: string) => {
    setClientPercent(pct);
    const pctNum = parseFloat(pct);
    if (!isNaN(pctNum) && totalAmount > 0) {
      const clientAmt = Math.ceil(totalAmount * pctNum) / 100;
      const companyAmt = Math.round((totalAmount - clientAmt) * 100) / 100;
      setClientAmount(clientAmt.toFixed(2));
      setCompanyAmount(companyAmt.toFixed(2));
    }
  };

  // Handle PLN input change — auto-compute the other field
  const handleSplitChange = (field: 'company' | 'client', value: string) => {
    if (field === 'company') {
      setCompanyAmount(value);
      const v = parseFloat(value);
      if (!isNaN(v) && totalAmount > 0) {
        setClientAmount(Math.max(0, Math.round((totalAmount - v) * 100) / 100).toFixed(2));
      }
    } else {
      setClientAmount(value);
      const v = parseFloat(value);
      if (!isNaN(v) && totalAmount > 0) {
        setCompanyAmount(Math.max(0, Math.round((totalAmount - v) * 100) / 100).toFixed(2));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateExpenseData = {
      category: formData.category,
      expense_date: formData.expense_date,
      payment_method: formData.payment_method as PaymentMethod,
      payer_type: formData.payer_type as PayerType,
    };

    if (!vehicleId && formData.vehicle) data.vehicle = formData.vehicle;

    if (categoryCode === 'FUEL') {
      data.fuel_types = fuelTypes;
      if (receiptFile) data.receipt = receiptFile;
    } else if (categoryCode === 'SERVICE') {
      if (formData.service) data.service = formData.service;
      const validItems = serviceItems.filter(item => item.name.trim());
      if (validItems.length) data.service_items_json = JSON.stringify(validItems);
      if (invoiceNumber) data.invoice_number = invoiceNumber;
      if (!foundInvoice && invoiceFile) data.invoice_file = invoiceFile;
    } else if (categoryCode === 'WASHING') {
      if (formData.wash_type) data.wash_type = formData.wash_type as WashType;
    } else if (categoryCode === 'FINES') {
      data.violation_type = formData.violation_type;
      if (formData.fine_number) data.fine_number = formData.fine_number;
      if (formData.fine_date) data.fine_date = formData.fine_date;
      if (formData.driver_at_time) data.driver_at_time = formData.driver_at_time;
    } else if (categoryCode === 'INSPECTION') {
      data.inspection_date = formData.inspection_date;
      data.official_cost = formData.official_cost;
      if (formData.additional_cost) data.additional_cost = formData.additional_cost;
      if (formData.next_inspection_date) data.next_inspection_date = formData.next_inspection_date;
      if (invoiceNumber) data.invoice_number = invoiceNumber;
      if (!foundInvoice && invoiceFile) data.invoice_file = invoiceFile;
    } else if (categoryCode === 'PARTS') {
      if (formData.source_name) data.source_name = formData.source_name;
      data.supplier_type = formData.supplier_type as SupplierType;
      const validParts = parts.filter(p => p.name.trim()).map(p => ({ ...p, quantity: p.quantity || 1 }));
      if (validParts.length) data.parts_json = JSON.stringify(validParts);
      if (invoiceNumber) data.invoice_number = invoiceNumber;
      if (!foundInvoice && invoiceFile) data.invoice_file = invoiceFile;
    } else if (categoryCode === 'ACCESSORIES' || categoryCode === 'DOCUMENTS') {
      const validParts = parts.filter(p => p.name.trim()).map(p => ({ ...p, quantity: p.quantity || 1 }));
      if (validParts.length) data.parts_json = JSON.stringify(validParts);
      if (invoiceNumber) data.invoice_number = invoiceNumber;
      if (!foundInvoice && invoiceFile) data.invoice_file = invoiceFile;
    } else if (categoryCode === 'OTHER') {
      if (formData.expense_for) data.expense_for = formData.expense_for;
    } else if (categoryCode === 'PARKING') {
      if (receiptFile) data.receipt = receiptFile;
    }

    // Amounts: CLIENT → split (company_amount + client_amount), COMPANY → amount
    if (formData.payer_type === 'CLIENT') {
      data.company_amount = companyAmount;
      data.client_amount = clientAmount;
      if (clientDriver) data.client_driver = clientDriver;
      if (excludeFromCost) data.exclude_from_cost = true;
    } else if (!isAutoAmountCategory) {
      data.amount = formData.amount;
    }

    try {
      await onSubmit(data);
    } catch (error: unknown) {
      const responseData =
        error && typeof error === 'object' && 'response' in error &&
        error.response && typeof error.response === 'object' && 'data' in error.response
          ? (error.response as { data: Record<string, string | string[]> }).data
          : null;
      if (responseData) {
        const backendErrors: Record<string, string> = {};
        Object.keys(responseData).forEach((key) => {
          const val = responseData[key];
          backendErrors[key] = Array.isArray(val) ? val[0] : String(val);
        });
        setErrors(backendErrors);
      }
    }
  };

  const inputClasses = (field: string) => `
    w-full px-3 py-2.5 border rounded-xl transition-colors text-sm
    text-slate-900 placeholder:text-slate-400
    focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
    disabled:bg-slate-100 disabled:cursor-not-allowed
    ${errors[field] ? 'border-red-500' : 'border-slate-300'}
  `;

  const noWheel = (e: React.WheelEvent<HTMLInputElement>) => (e.target as HTMLInputElement).blur();

  const labelClasses = 'block text-sm font-medium text-slate-700 mb-1';

  const renderError = (field: string) =>
    errors[field] ? <p className="mt-1 text-xs text-red-600">{errors[field]}</p> : null;

  const renderTypeSpecificFields = () => {
    switch (categoryCode) {
      case 'FUEL':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClasses}>{t('fields.fuelType')} *</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {FUEL_TYPES.map(ft => {
                  const selected = fuelTypes.includes(ft);
                  return (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setFuelTypes(prev => selected ? prev.filter(v => v !== ft) : [...prev, ft])}
                      disabled={isLoading}
                      className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-150 ${
                        selected
                          ? 'bg-teal-500 text-white border-teal-500 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-teal-400 hover:text-teal-600'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {t(`fuelTypes.${ft}`)}
                    </button>
                  );
                })}
              </div>
              {renderError('fuel_types')}
            </div>
            <FileInput label={t('fields.receipt')} onChange={setReceiptFile} disabled={isLoading} />
          </div>
        );

      case 'SERVICE':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClasses}>{t('fields.selectService')}</label>
              <select name="service" value={formData.service} onChange={handleChange} disabled={isLoading} className={inputClasses('service')}>
                <option value="">—</option>
                {fleetServices.map(svc => <option key={svc.id} value={svc.id}>{svc.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClasses}>{t('fields.serviceItems')}</label>
                <button type="button" onClick={addServiceItem} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> {t('fields.addServiceItem')}
                </button>
              </div>
              <div className="space-y-3">
                {serviceItems.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">#{idx + 1}</span>
                      {serviceItems.length > 1 && (
                        <button type="button" onClick={() => removeServiceItem(idx)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input type="text" placeholder={t('fields.serviceName')} value={item.name} onChange={(e) => handleServiceItemChange(idx, 'name', e.target.value)} disabled={isLoading} className={inputClasses('service_item_name')} />
                      </div>
                      <div>
                        <input type="number" placeholder={t('fields.servicePrice')} step="0.01" value={item.price} onChange={(e) => handleServiceItemChange(idx, 'price', e.target.value)} onWheel={noWheel} disabled={isLoading} className={inputClasses('service_item_price')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {serviceTotal > 0 && (
                <div className="mt-2 text-right">
                  <span className="text-sm font-bold text-teal-700 tabular-nums bg-teal-50 px-3 py-1.5 rounded-lg inline-block">
                    {t('fields.amount')}: {serviceTotal.toFixed(2)} PLN
                  </span>
                </div>
              )}
            </div>

            <InvoiceInput
              invoiceNumber={invoiceNumber}
              onNumberChange={setInvoiceNumber}
              foundInvoice={foundInvoice}
              onInvoiceFound={setFoundInvoice}
              file={invoiceFile}
              onFileChange={setInvoiceFile}
              disabled={isLoading}
            />
          </div>
        );

      case 'WASHING':
        return (
          <div>
            <label className={labelClasses}>{t('fields.washType')}</label>
            <select name="wash_type" value={formData.wash_type} onChange={handleChange} disabled={isLoading} className={inputClasses('wash_type')}>
              <option value="">—</option>
              {WASH_TYPES.map(wt => <option key={wt} value={wt}>{t(`washTypes.${wt}`)}</option>)}
            </select>
          </div>
        );

      case 'FINES':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>{t('fields.violationType')} *</label>
              <input type="text" name="violation_type" value={formData.violation_type} onChange={handleChange} disabled={isLoading} className={inputClasses('violation_type')} />
              {renderError('violation_type')}
            </div>
            <div>
              <label className={labelClasses}>{t('fields.fineNumber')}</label>
              <input type="text" name="fine_number" value={formData.fine_number} onChange={handleChange} disabled={isLoading} className={inputClasses('fine_number')} />
            </div>
            <div>
              <label className={labelClasses}>{t('fields.fineDate')}</label>
              <input type="date" name="fine_date" value={formData.fine_date} onChange={handleChange} disabled={isLoading} className={`${inputClasses('fine_date')}${!formData.fine_date ? ' date-empty' : ''}`} />
            </div>
          </div>
        );

      case 'INSPECTION':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>{t('fields.inspectionDate')} *</label>
                <input type="date" name="inspection_date" value={formData.inspection_date} onChange={handleChange} disabled={isLoading} className={`${inputClasses('inspection_date')}${!formData.inspection_date ? ' date-empty' : ''}`} />
                {renderError('inspection_date')}
              </div>
              <div>
                <label className={labelClasses}>{t('fields.nextInspectionDate')}</label>
                <input type="date" name="next_inspection_date" value={formData.next_inspection_date} onChange={handleChange} disabled={isLoading} className={`${inputClasses('next_inspection_date')}${!formData.next_inspection_date ? ' date-empty' : ''}`} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>{t('fields.officialCost')} *</label>
                <input type="number" name="official_cost" step="0.01" value={formData.official_cost} onChange={handleChange} onWheel={noWheel} disabled={isLoading} className={inputClasses('official_cost')} />
                {renderError('official_cost')}
              </div>
              <div>
                <label className={labelClasses}>{t('fields.additionalCost')}</label>
                <input type="number" name="additional_cost" step="0.01" value={formData.additional_cost} onChange={handleChange} onWheel={noWheel} disabled={isLoading} className={inputClasses('additional_cost')} />
                {renderError('additional_cost')}
              </div>
            </div>
            {inspectionTotal > 0 && (
              <div className="text-right">
                <span className="text-sm font-bold text-teal-700 tabular-nums bg-teal-50 px-3 py-1.5 rounded-lg inline-block">
                  {t('fields.amount')}: {inspectionTotal.toFixed(2)} PLN
                </span>
              </div>
            )}
            <InvoiceInput
              invoiceNumber={invoiceNumber}
              onNumberChange={setInvoiceNumber}
              foundInvoice={foundInvoice}
              onInvoiceFound={setFoundInvoice}
              file={invoiceFile}
              onFileChange={setInvoiceFile}
              disabled={isLoading}
            />
          </div>
        );

      case 'PARTS':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>{t('fields.sourceName')}</label>
                <input type="text" name="source_name" value={formData.source_name} onChange={handleChange} disabled={isLoading} className={inputClasses('source_name')} placeholder="Allegro, OLX..." />
              </div>
              <div>
                <label className={labelClasses}>{t('fields.supplierType')}</label>
                <select name="supplier_type" value={formData.supplier_type} onChange={handleChange} disabled={isLoading} className={inputClasses('supplier_type')}>
                  {SUPPLIER_TYPES.map(st => <option key={st} value={st}>{t(`supplierTypes.${st}`)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClasses}>{t('fields.partName')}</label>
                <button type="button" onClick={addPart} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> {t('fields.addPart')}
                </button>
              </div>
              <div className="space-y-3">
                {parts.map((part, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">#{idx + 1}</span>
                      {parts.length > 1 && (
                        <button type="button" onClick={() => removePart(idx)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="sm:col-span-2">
                        <input type="text" placeholder={t('fields.partName')} value={part.name} onChange={(e) => handlePartChange(idx, 'name', e.target.value)} disabled={isLoading} className={inputClasses('part_name')} />
                      </div>
                      <div>
                        <input type="number" placeholder={t('fields.quantity')} min="1" value={part.quantity} onChange={(e) => handlePartChange(idx, 'quantity', e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 1))} onWheel={noWheel} disabled={isLoading} className={inputClasses('quantity')} />
                      </div>
                      <div>
                        <input type="number" placeholder={t('fields.unitPrice')} step="0.01" value={part.unit_price} onChange={(e) => handlePartChange(idx, 'unit_price', e.target.value)} onWheel={noWheel} disabled={isLoading} className={inputClasses('unit_price')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {partsTotal > 0 && (
                <div className="mt-2 text-right">
                  <span className="text-sm font-bold text-teal-700 tabular-nums bg-teal-50 px-3 py-1.5 rounded-lg inline-block">
                    {t('fields.amount')}: {partsTotal.toFixed(2)} PLN
                  </span>
                </div>
              )}
            </div>

            <InvoiceInput
              invoiceNumber={invoiceNumber}
              onNumberChange={setInvoiceNumber}
              foundInvoice={foundInvoice}
              onInvoiceFound={setFoundInvoice}
              file={invoiceFile}
              onFileChange={setInvoiceFile}
              disabled={isLoading}
            />
          </div>
        );

      case 'ACCESSORIES':
      case 'DOCUMENTS':
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelClasses}>{t('fields.itemName')}</label>
                <button type="button" onClick={addPart} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> {t('fields.addItem')}
                </button>
              </div>
              <div className="space-y-3">
                {parts.map((part, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">#{idx + 1}</span>
                      {parts.length > 1 && (
                        <button type="button" onClick={() => removePart(idx)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="sm:col-span-2">
                        <input type="text" placeholder={t('fields.itemName')} value={part.name} onChange={(e) => handlePartChange(idx, 'name', e.target.value)} disabled={isLoading} className={inputClasses('item_name')} />
                      </div>
                      <div>
                        <input type="number" placeholder={t('fields.quantity')} min="1" value={part.quantity} onChange={(e) => handlePartChange(idx, 'quantity', e.target.value === '' ? '' : (parseInt(e.target.value, 10) || 1))} onWheel={noWheel} disabled={isLoading} className={inputClasses('quantity')} />
                      </div>
                      <div>
                        <input type="number" placeholder={t('fields.unitPrice')} step="0.01" value={part.unit_price} onChange={(e) => handlePartChange(idx, 'unit_price', e.target.value)} onWheel={noWheel} disabled={isLoading} className={inputClasses('unit_price')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {partsTotal > 0 && (
                <div className="mt-2 text-right">
                  <span className="text-sm font-bold text-teal-700 tabular-nums bg-teal-50 px-3 py-1.5 rounded-lg inline-block">
                    {t('fields.amount')}: {partsTotal.toFixed(2)} PLN
                  </span>
                </div>
              )}
            </div>

            <InvoiceInput
              invoiceNumber={invoiceNumber}
              onNumberChange={setInvoiceNumber}
              foundInvoice={foundInvoice}
              onInvoiceFound={setFoundInvoice}
              file={invoiceFile}
              onFileChange={setInvoiceFile}
              disabled={isLoading}
            />
          </div>
        );

      case 'OTHER':
        return (
          <div>
            <label className={labelClasses}>{t('fields.expenseName')}</label>
            <input type="text" name="expense_for" value={formData.expense_for} onChange={handleChange} disabled={isLoading} className={inputClasses('expense_for')} placeholder={t('fields.expenseNamePlaceholder')} />
          </div>
        );

      case 'PARKING':
        return (
          <FileInput label={t('fields.receipt')} onChange={setReceiptFile} disabled={isLoading} />
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!vehicleId && vehicles && (
        <div>
          <label className={labelClasses}>{t('fields.vehicle')} *</label>
          <VehicleAutocomplete
            vehicles={vehicles}
            value={formData.vehicle}
            onChange={(id) => {
              setFormData(prev => ({ ...prev, vehicle: id }));
              if (errors.vehicle) {
                setErrors(prev => { const next = { ...prev }; delete next.vehicle; return next; });
              }
            }}
            placeholder={t('fields.vehicle')}
            disabled={isLoading}
            hasError={!!errors.vehicle}
          />
          {renderError('vehicle')}
        </div>
      )}

      <div className={isAutoAmountCategory ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
        <div>
          <label className={labelClasses}>{t('fields.category')} *</label>
          <select name="category" value={formData.category} onChange={handleChange} disabled={isLoading} className={inputClasses('category')}>
            <option value="">—</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.code ? t(`types.${cat.code}`) : cat.name}
              </option>
            ))}
          </select>
          {renderError('category')}
        </div>
        {!isAutoAmountCategory && (
          <div>
            <label className={labelClasses}>{t('fields.amount')} *</label>
            <input type="number" name="amount" step="0.01" value={formData.amount} onChange={handleChange} onWheel={noWheel} disabled={isLoading} className={inputClasses('amount')} />
            {renderError('amount')}
          </div>
        )}
      </div>

      <div>
        <label className={labelClasses}>{t('fields.expenseDate')} *</label>
        <input type="datetime-local" name="expense_date" value={formData.expense_date} onChange={handleChange} disabled={isLoading} className={inputClasses('expense_date')} />
        {renderError('expense_date')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>{t('fields.paymentMethod')}</label>
          <select name="payment_method" value={formData.payment_method} onChange={handleChange} disabled={isLoading} className={inputClasses('payment_method')}>
            {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{t(`paymentMethods.${pm}`)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClasses}>{t('fields.payerType')}</label>
          <select name="payer_type" value={formData.payer_type} onChange={handleChange} disabled={isLoading} className={inputClasses('payer_type')}>
            {PAYER_TYPES.map(pt => <option key={pt} value={pt}>{t(`payerTypes.${pt}`)}</option>)}
          </select>
        </div>
      </div>

      {/* Cost splitting (CLIENT payer_type) */}
      {isClientPayer && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-4">
          <p className="text-sm font-semibold text-amber-800">{t('fields.costSplitting')}</p>

          {/* Auto-resolved driver */}
          <div>
            <label className={labelClasses}>{t('fields.clientDriver')}</label>
            <div className="px-3 py-2.5 bg-white border border-amber-200 rounded-xl text-sm text-slate-900 font-medium">
              {resolvedDriverLabel || '—'}
            </div>
          </div>

          {/* Split mode toggle */}
          <div className="flex gap-1 p-1 bg-white rounded-lg border border-amber-200 w-fit">
            {(['PLN', '%'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setSplitMode(mode)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  splitMode === mode
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-amber-700 hover:bg-amber-100'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Split amount fields */}
          {splitMode === '%' ? (
            <div>
              <label className={labelClasses}>{t('fields.clientPercent')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={clientPercent}
                  onChange={(e) => handlePercentChange(e.target.value)}
                  onWheel={noWheel}
                  disabled={isLoading || totalAmount <= 0}
                  className={`${inputClasses('client_percent')} max-w-[120px]`}
                  placeholder="0"
                />
                <span className="text-sm text-amber-700">%</span>
                {totalAmount > 0 && clientPercent && (
                  <span className="text-xs text-amber-600">
                    = {clientAmount} PLN
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>{t('fields.companyAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={companyAmount}
                  onChange={(e) => handleSplitChange('company', e.target.value)}
                  onWheel={noWheel}
                  disabled={isLoading}
                  className={inputClasses('company_amount')}
                />
                {renderError('company_amount')}
              </div>
              <div>
                <label className={labelClasses}>{t('fields.clientAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={clientAmount}
                  onChange={(e) => handleSplitChange('client', e.target.value)}
                  onWheel={noWheel}
                  disabled={isLoading}
                  className={inputClasses('client_amount')}
                />
                {renderError('client_amount')}
              </div>
            </div>
          )}

          {/* Split validation indicator */}
          {totalAmount > 0 && (companyAmount || clientAmount) && (
            <div className={`flex items-center gap-2 text-sm ${splitValid ? 'text-green-600' : 'text-red-600'}`}>
              {splitValid ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>
                {splitValid
                  ? `${t('fields.companyAmount')}: ${companyAmount} + ${t('fields.clientAmount')}: ${clientAmount} = ${totalAmount.toFixed(2)} PLN`
                  : `${t('fields.splitMismatch')}: ${splitSum.toFixed(2)} ≠ ${totalAmount.toFixed(2)}`
                }
              </span>
            </div>
          )}

          {/* Exclude from vehicle cost */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={excludeFromCost}
              onChange={(e) => setExcludeFromCost(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500/30 cursor-pointer"
            />
            <span className="text-sm text-amber-800 group-hover:text-amber-900 select-none leading-snug">
              {t('fields.excludeFromCost')}
            </span>
          </label>
        </div>
      )}

      {renderTypeSpecificFields()}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 pb-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-3 sm:py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full sm:flex-1 px-6 py-3 sm:py-2.5 bg-gradient-to-r from-[#2D8B7E] to-[#246f65] text-white rounded-xl font-semibold transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-[#2D8B7E]/20'}`}
        >
          {isLoading ? tCommon('loading') : initialData ? t('editExpense') : t('addExpense')}
        </button>
      </div>
    </form>
  );
}
