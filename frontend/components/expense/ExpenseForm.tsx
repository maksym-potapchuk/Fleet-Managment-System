'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Expense, CreateExpenseData, ExpenseCategory, ExpensePart, ServiceItem, FuelType, WashType, PaymentMethod, PayerType, SupplierType } from '@/types/expense';
import { Service } from '@/types/service';
import { Vehicle } from '@/types/vehicle';
import { getAllServices } from '@/services/service';
import { VehicleAutocomplete } from '@/components/expense/VehicleAutocomplete';
import { FileInput } from '@/components/common/FileInput';
import { Plus, Trash2 } from 'lucide-react';

interface ExpenseFormProps {
  onSubmit: (data: CreateExpenseData) => Promise<void>;
  onCancel: () => void;
  categories: ExpenseCategory[];
  initialData?: Expense | null;
  isLoading?: boolean;
  vehicleId?: string;
  vehicles?: Vehicle[];
}

const FUEL_TYPES: FuelType[] = ['GASOLINE', 'DIESEL', 'LPG', 'ELECTRIC'];
const WASH_TYPES: WashType[] = ['EXTERIOR', 'INTERIOR', 'FULL'];
const PAYMENT_METHODS: PaymentMethod[] = ['CASHLESS', 'CASH'];
const PAYER_TYPES: PayerType[] = ['COMPANY', 'CLIENT'];
const SUPPLIER_TYPES: SupplierType[] = ['DISASSEMBLY', 'INDIVIDUAL'];

const emptyPart = (): ExpensePart => ({ name: '', quantity: 1, unit_price: '' });
const emptyServiceItem = (): ServiceItem => ({ name: '', price: '' });

export function ExpenseForm({ onSubmit, onCancel, categories, initialData, isLoading = false, vehicleId, vehicles }: ExpenseFormProps) {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');

  const [formData, setFormData] = useState<Record<string, string>>({
    vehicle: initialData?.vehicle || vehicleId || '',
    category: initialData?.category || '',
    amount: initialData?.amount || '',
    expense_date: initialData?.expense_date || new Date().toISOString().split('T')[0],
    // Payment & payer
    payment_method: initialData?.payment_method || 'CASHLESS',
    payer_type: initialData?.payer_type || 'COMPANY',
    expense_for: initialData?.expense_for || '',
    // PARTS detail
    source_name: initialData?.source_name || '',
    supplier_type: initialData?.supplier_type || 'DISASSEMBLY',
    // FUEL
    liters: initialData?.liters || '',
    fuel_type: initialData?.fuel_type || '',
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

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [parts, setParts] = useState<ExpensePart[]>(initialData?.parts?.length ? initialData.parts : [emptyPart()]);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>(initialData?.service_items?.length ? initialData.service_items : [emptyServiceItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fleetServices, setFleetServices] = useState<Service[]>([]);

  const selectedCategory = categories.find(c => c.id === formData.category);
  const categoryCode = selectedCategory?.code || null;
  const isAutoAmountCategory = categoryCode === 'SERVICE' || categoryCode === 'PARTS' || categoryCode === 'INSPECTION' || categoryCode === 'ACCESSORIES' || categoryCode === 'DOCUMENTS';

  // Load fleet services once on mount
  useEffect(() => {
    let ignore = false;
    getAllServices()
      .then(services => { if (!ignore) setFleetServices(services); })
      .catch(() => {});
    return () => { ignore = true; };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
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
      data.amount = formData.amount;
      data.liters = formData.liters;
      data.fuel_type = formData.fuel_type as FuelType;
      if (receiptFile) data.receipt = receiptFile;
    } else if (categoryCode === 'SERVICE') {
      if (!invoiceFile && !initialData) {
        setErrors(prev => ({ ...prev, invoice: t('fields.invoiceRequired') }));
        return;
      }
      if (formData.service) data.service = formData.service;
      const validItems = serviceItems.filter(item => item.name.trim());
      if (validItems.length) data.service_items_json = JSON.stringify(validItems);
      if (invoiceFile) data.invoice_files = [invoiceFile];
    } else if (categoryCode === 'WASHING') {
      data.amount = formData.amount;
      if (formData.wash_type) data.wash_type = formData.wash_type as WashType;
    } else if (categoryCode === 'FINES') {
      data.amount = formData.amount;
      data.violation_type = formData.violation_type;
      if (formData.fine_number) data.fine_number = formData.fine_number;
      if (formData.fine_date) data.fine_date = formData.fine_date;
      if (formData.driver_at_time) data.driver_at_time = formData.driver_at_time;
    } else if (categoryCode === 'INSPECTION') {
      data.inspection_date = formData.inspection_date;
      data.official_cost = formData.official_cost;
      if (formData.additional_cost) data.additional_cost = formData.additional_cost;
      if (formData.next_inspection_date) data.next_inspection_date = formData.next_inspection_date;
    } else if (categoryCode === 'PARTS') {
      if (formData.source_name) data.source_name = formData.source_name;
      data.supplier_type = formData.supplier_type as SupplierType;
      const validParts = parts.filter(p => p.name.trim());
      if (validParts.length) data.parts_json = JSON.stringify(validParts);
      if (invoiceFile) data.invoice_files = [invoiceFile];
    } else if (categoryCode === 'ACCESSORIES' || categoryCode === 'DOCUMENTS') {
      const validParts = parts.filter(p => p.name.trim());
      if (validParts.length) data.parts_json = JSON.stringify(validParts);
      if (invoiceFile) data.invoice_files = [invoiceFile];
    } else if (categoryCode === 'OTHER') {
      data.amount = formData.amount;
      if (formData.expense_for) data.expense_for = formData.expense_for;
    } else {
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

  const labelClasses = 'block text-sm font-medium text-slate-700 mb-1';

  const renderError = (field: string) =>
    errors[field] ? <p className="mt-1 text-xs text-red-600">{errors[field]}</p> : null;

  const renderTypeSpecificFields = () => {
    switch (categoryCode) {
      case 'FUEL':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>{t('fields.liters')} *</label>
                <input type="number" name="liters" step="0.01" value={formData.liters} onChange={handleChange} disabled={isLoading} className={inputClasses('liters')} />
                {renderError('liters')}
              </div>
              <div>
                <label className={labelClasses}>{t('fields.fuelType')} *</label>
                <select name="fuel_type" value={formData.fuel_type} onChange={handleChange} disabled={isLoading} className={inputClasses('fuel_type')}>
                  <option value="">—</option>
                  {FUEL_TYPES.map(ft => <option key={ft} value={ft}>{t(`fuelTypes.${ft}`)}</option>)}
                </select>
                {renderError('fuel_type')}
              </div>
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
                        <input type="number" placeholder={t('fields.servicePrice')} step="0.01" value={item.price} onChange={(e) => handleServiceItemChange(idx, 'price', e.target.value)} disabled={isLoading} className={inputClasses('service_item_price')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {serviceTotal > 0 && (
                <div className="mt-2 text-right text-sm font-medium text-slate-700">
                  {t('fields.amount')}: {serviceTotal.toFixed(2)}
                </div>
              )}
            </div>

            <FileInput label={t('fields.invoice')} required onChange={setInvoiceFile} disabled={isLoading} hasError={!!errors.invoice} />
            {errors.invoice && <p className="mt-1 text-xs text-red-600">{errors.invoice}</p>}
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
              <input type="date" name="fine_date" value={formData.fine_date} onChange={handleChange} disabled={isLoading} className={inputClasses('fine_date')} />
            </div>
          </div>
        );

      case 'INSPECTION':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>{t('fields.inspectionDate')} *</label>
                <input type="date" name="inspection_date" value={formData.inspection_date} onChange={handleChange} disabled={isLoading} className={inputClasses('inspection_date')} />
                {renderError('inspection_date')}
              </div>
              <div>
                <label className={labelClasses}>{t('fields.nextInspectionDate')}</label>
                <input type="date" name="next_inspection_date" value={formData.next_inspection_date} onChange={handleChange} disabled={isLoading} className={inputClasses('next_inspection_date')} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>{t('fields.officialCost')} *</label>
                <input type="number" name="official_cost" step="0.01" value={formData.official_cost} onChange={handleChange} disabled={isLoading} className={inputClasses('official_cost')} />
                {renderError('official_cost')}
              </div>
              <div>
                <label className={labelClasses}>{t('fields.additionalCost')}</label>
                <input type="number" name="additional_cost" step="0.01" value={formData.additional_cost} onChange={handleChange} disabled={isLoading} className={inputClasses('additional_cost')} />
                {renderError('additional_cost')}
              </div>
            </div>
            {inspectionTotal > 0 && (
              <div className="text-right text-sm font-medium text-slate-700">
                {t('fields.amount')}: {inspectionTotal.toFixed(2)}
              </div>
            )}
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
                        <input type="number" placeholder={t('fields.quantity')} min="1" value={part.quantity} onChange={(e) => handlePartChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)} disabled={isLoading} className={inputClasses('quantity')} />
                      </div>
                      <div>
                        <input type="number" placeholder={t('fields.unitPrice')} step="0.01" value={part.unit_price} onChange={(e) => handlePartChange(idx, 'unit_price', e.target.value)} disabled={isLoading} className={inputClasses('unit_price')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {partsTotal > 0 && (
                <div className="mt-2 text-right text-sm font-medium text-slate-700">
                  {t('fields.amount')}: {partsTotal.toFixed(2)}
                </div>
              )}
            </div>

            <FileInput label={t('fields.invoice')} onChange={setInvoiceFile} disabled={isLoading} />
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
                        <input type="number" placeholder={t('fields.quantity')} min="1" value={part.quantity} onChange={(e) => handlePartChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)} disabled={isLoading} className={inputClasses('quantity')} />
                      </div>
                      <div>
                        <input type="number" placeholder={t('fields.unitPrice')} step="0.01" value={part.unit_price} onChange={(e) => handlePartChange(idx, 'unit_price', e.target.value)} disabled={isLoading} className={inputClasses('unit_price')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {partsTotal > 0 && (
                <div className="mt-2 text-right text-sm font-medium text-slate-700">
                  {t('fields.amount')}: {partsTotal.toFixed(2)}
                </div>
              )}
            </div>

            <FileInput label={t('fields.invoice')} onChange={setInvoiceFile} disabled={isLoading} />
          </div>
        );

      case 'OTHER':
        return (
          <div>
            <label className={labelClasses}>{t('fields.expenseName')}</label>
            <input type="text" name="expense_for" value={formData.expense_for} onChange={handleChange} disabled={isLoading} className={inputClasses('expense_for')} placeholder={t('fields.expenseNamePlaceholder')} />
          </div>
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
            <input type="number" name="amount" step="0.01" value={formData.amount} onChange={handleChange} disabled={isLoading} className={inputClasses('amount')} />
            {renderError('amount')}
          </div>
        )}
      </div>

      <div>
        <label className={labelClasses}>{t('fields.expenseDate')} *</label>
        <input type="date" name="expense_date" value={formData.expense_date} onChange={handleChange} disabled={isLoading} className={inputClasses('expense_date')} />
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
