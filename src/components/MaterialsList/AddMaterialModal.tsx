// src/components/MaterialsList/AddMaterialModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { PhotoThumbnail } from './PhotoThumbnail';
import { PhotoPreviewModal } from './PhotoPreviewModal';

export interface ReviewItemData {
  item: string;
  vendor: string;
  price: number | '';
  company: string;
  qtyValue: number | '';
  qtyUnit: string;
  gstRate: number | '';
  isGSTInvoice: boolean;
  date: string;
  invoiceNumber: string;
  photoUrl?: string;
  confidenceScore?: number;
}

export interface ModalInitialData {
  items: ReviewItemData[];
  source: 'ai' | 'manual';
  photoUrl?: string;
  documentType?: 'material_photo' | 'invoice' | 'receipt' | 'unknown';
}

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: ReviewItemData[]) => Promise<{ success: boolean; error?: string } | void> | { success: boolean; error?: string } | void;
  initialData?: ModalInitialData | null;
}

const SUPPORTED_UNITS = [
  "no's",
  "kg's",
  'pieces',
  'meters',
  'bundles',
  'bags',
  'tons',
  'rolls',
  'sets',
  'sq ft',
  'brass',
  'litres',
];

export const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  initialData,
}) => {
  const isAIMode = initialData?.source === 'ai';
  // For material photos, hide invoice-specific fields
  const isMaterialPhoto = !initialData?.documentType || initialData?.documentType === 'material_photo';
  const showInvoiceFields = !isMaterialPhoto; // Only show invoice fields for explicit invoice uploads

  const [items, setItems] = useState<ReviewItemData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const itemNameRef = React.useRef<HTMLInputElement>(null);
  const supplierRef = React.useRef<HTMLInputElement>(null);
  const brandRef = React.useRef<HTMLInputElement>(null);
  const unitPriceRef = React.useRef<HTMLInputElement>(null);

  const [validationErrors, setValidationErrors] = useState<{
    item?: string;
    vendor?: string;
    company?: string;
    price?: string;
  }>({});

  // Initialize or reset form whenever modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setValidationErrors({});
      if (initialData?.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((it) => ({
            item: it.item || '',
            vendor: it.vendor || '',
            price: typeof it.price === 'number' && !isNaN(it.price) ? it.price : '',
            company: it.company || '',
            qtyValue: typeof it.qtyValue === 'number' && !isNaN(it.qtyValue) ? it.qtyValue : '',
            qtyUnit: it.qtyUnit || "no's",
            gstRate: typeof it.gstRate === 'number' && !isNaN(it.gstRate) ? it.gstRate : 18,
            isGSTInvoice: it.isGSTInvoice ?? false,
            date: it.date || new Date().toISOString().split('T')[0],
            invoiceNumber: it.invoiceNumber || '',
            photoUrl: it.photoUrl || initialData.photoUrl || '',
            confidenceScore: it.confidenceScore,
          }))
        );
        setActiveIndex(0);
      } else {
        setItems([
          {
            item: '',
            vendor: '',
            price: '',
            company: '',
            qtyValue: '',
            qtyUnit: "no's",
            gstRate: 18,
            isGSTInvoice: false,
            date: new Date().toISOString().split('T')[0],
            invoiceNumber: '',
          },
        ]);
        setActiveIndex(0);
      }
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const currentItem: ReviewItemData = items[activeIndex] || {
    item: '',
    vendor: '',
    price: '',
    company: '',
    qtyValue: '',
    qtyUnit: "no's",
    gstRate: 18,
    isGSTInvoice: false,
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
  };

  const updateCurrentItem = (updates: Partial<ReviewItemData>) => {
    setItems((prev) => {
      const next = [...prev];
      if (next[activeIndex]) {
        next[activeIndex] = { ...next[activeIndex], ...updates };
      }
      return next;
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    setValidationErrors({});
    onClose();
  };

  const handleDecreaseQty = () => {
    const current = typeof currentItem.qtyValue === 'number' && !isNaN(currentItem.qtyValue) ? currentItem.qtyValue : 1;
    const nextVal = Math.max(1, Math.round(current) - 1);
    updateCurrentItem({ qtyValue: nextVal });
  };

  const handleIncreaseQty = () => {
    const current = typeof currentItem.qtyValue === 'number' && !isNaN(currentItem.qtyValue) ? currentItem.qtyValue : 0;
    const nextVal = Math.max(1, Math.round(current) + 1);
    updateCurrentItem({ qtyValue: nextVal });
  };

  // Dynamic calculations for active item
  const numericPrice = typeof currentItem.price === 'number' && !isNaN(currentItem.price) ? currentItem.price : null;
  const numericQty = typeof currentItem.qtyValue === 'number' && !isNaN(currentItem.qtyValue) ? currentItem.qtyValue : null;
  const hasCalculableTotal = numericPrice !== null && numericQty !== null;

  const subtotal = hasCalculableTotal ? numericPrice * numericQty : 0;
  const activeGstRate =
    typeof currentItem.gstRate === 'number' && !isNaN(currentItem.gstRate)
      ? currentItem.gstRate
      : 18;
  const effectiveGstRate = currentItem.isGSTInvoice ? activeGstRate : 0;
  const gstAmount = hasCalculableTotal && currentItem.isGSTInvoice ? (subtotal * effectiveGstRate) / 100 : 0;
  const netTotal = hasCalculableTotal ? subtotal + gstAmount : 0;

  const formatCurrency = (val: number): string => {
    const rounded = Math.round(val * 100) / 100;
    return Number.isInteger(rounded)
      ? rounded.toLocaleString('en-IN')
      : rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setValidationErrors({});

    // Validate that each item has all four required fields: Material Name, Supplier, Brand, Unit Price
    for (let i = 0; i < items.length; i++) {
      const cur = items[i];
      const itemTrimmed = (cur.item || '').trim();
      const vendorTrimmed = (cur.vendor || '').trim();
      const companyTrimmed = (cur.company || '').trim();
      const priceValid = typeof cur.price === 'number' && !isNaN(cur.price) && cur.price > 0;

      const itemErrors: { item?: string; vendor?: string; company?: string; price?: string } = {};

      if (!itemTrimmed) {
        itemErrors.item = 'Material Name is required.';
      }
      if (!vendorTrimmed) {
        itemErrors.vendor = 'Supplier is required.';
      }
      if (!companyTrimmed) {
        itemErrors.company = 'Brand is required.';
      }
      if (!priceValid) {
        itemErrors.price = 'Unit Price is required and must be greater than zero.';
      }

      if (typeof cur.qtyValue === 'number' && (cur.qtyValue as number) < 0) {
        setActiveIndex(i);
        setErrorMessage(`Item #${i + 1} has an invalid negative quantity.`);
        return;
      }

      if (Object.keys(itemErrors).length > 0) {
        setActiveIndex(i);
        setValidationErrors(itemErrors);
        const missingLabels: string[] = [];
        if (itemErrors.item) missingLabels.push('Material Name');
        if (itemErrors.vendor) missingLabels.push('Supplier');
        if (itemErrors.company) missingLabels.push('Brand');
        if (itemErrors.price) missingLabels.push('Unit Price');

        setErrorMessage(
          items.length > 1
            ? `Item #${i + 1}: Please enter required fields: ${missingLabels.join(', ')}.`
            : `Please enter required fields: ${missingLabels.join(', ')}.`
        );

        setTimeout(() => {
          if (itemErrors.item) itemNameRef.current?.focus();
          else if (itemErrors.vendor) supplierRef.current?.focus();
          else if (itemErrors.company) brandRef.current?.focus();
          else if (itemErrors.price) unitPriceRef.current?.focus();
        }, 50);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await onAdd(items);
      if (res && typeof res === 'object' && res.success === false) {
        setErrorMessage(res.error || 'Failed to save material. Please try again.');
        setIsSubmitting(false);
        return;
      }
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding material.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const fieldHintStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#64748B',
    marginTop: '3px',
    display: 'block',
    fontWeight: 500,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(32, 32, 32, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-hard-lg)',
          border: '2.5px solid var(--color-border)',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '2px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-subtle)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-logo-bg)',
                border: '2px solid var(--color-border)',
                boxShadow: 'var(--shadow-hard-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#202020',
                flexShrink: 0,
              }}
            >
              {/* PW Materials app logo - play/forward mark */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#202020" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z" />
                <path d="M21 7v10" />
              </svg>
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                {isAIMode
                  ? items.length > 1
                    ? `Review materials (${items.length} items)`
                    : 'Review material'
                  : 'Add material'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px', flexShrink: 0 }}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Multi-item switcher strip when more than 1 item was extracted */}
        {items.length > 1 && (
          <div
            style={{
              padding: '10px 16px',
              background: 'var(--bg-card)',
              borderBottom: '2px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginRight: '4px', whiteSpace: 'nowrap' }}>
              Line Items:
            </span>
            {items.map((it, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setValidationErrors({});
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-border)',
                    background: isSelected ? 'var(--color-primary-selected)' : 'var(--bg-surface)',
                    color: '#202020',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: isSelected ? 'var(--shadow-hard-xs)' : 'none',
                    whiteSpace: 'nowrap',
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={it.item || `Item ${idx + 1}`}
                >
                  #{idx + 1} {it.item || 'Unspecified'}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            flex: 1,
            boxSizing: 'border-box',
          }}
        >
          {/* Material Image Preview Section */}
          {(currentItem.photoUrl || initialData?.photoUrl) && (
            <div
              style={{
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-hard-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                onClick={() => setIsPreviewOpen(true)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Click to view full photo"
              >
                <PhotoThumbnail
                  photoUrl={currentItem.photoUrl || initialData?.photoUrl}
                  alt="Uploaded material photo"
                  size={42}
                  onClick={() => setIsPreviewOpen(true)}
                />
              </div>
              <div
                onClick={() => setIsPreviewOpen(true)}
                style={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Uploaded material photo
                </span>
                <p style={{ margin: '1px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Click thumbnail to view full image
                </p>
              </div>
            </div>
          )}

          {/* 1. Material Name */}
          <div>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Material Name <span style={{ color: '#EF4444', fontWeight: 700 }}>*</span>
            </label>
            <input
              ref={itemNameRef}
              type="text"
              placeholder="e.g. 32A Double Pole MCB"
              value={currentItem.item}
              onChange={(e) => {
                updateCurrentItem({ item: e.target.value });
                if (validationErrors.item) setValidationErrors((prev) => ({ ...prev, item: undefined }));
              }}
              className="input-base"
              style={{
                borderColor: validationErrors.item ? '#EF4444' : undefined,
              }}
              autoFocus
            />
            {validationErrors.item && (
              <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, marginTop: '3px', display: 'block' }}>
                {validationErrors.item}
              </span>
            )}
          </div>

          {/* 2. Supplier & Brand */}
          <div className="modal-grid-2col">
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Supplier <span style={{ color: '#EF4444', fontWeight: 700 }}>*</span>
              </label>
              <input
                ref={supplierRef}
                type="text"
                placeholder="e.g. ABC Electricals"
                value={currentItem.vendor}
                onChange={(e) => {
                  updateCurrentItem({ vendor: e.target.value });
                  if (validationErrors.vendor) setValidationErrors((prev) => ({ ...prev, vendor: undefined }));
                }}
                className="input-base"
                style={{
                  borderColor: validationErrors.vendor ? '#EF4444' : undefined,
                }}
              />
              {validationErrors.vendor && (
                <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, marginTop: '3px', display: 'block' }}>
                  {validationErrors.vendor}
                </span>
              )}
            </div>

            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Brand <span style={{ color: '#EF4444', fontWeight: 700 }}>*</span>
              </label>
              <input
                ref={brandRef}
                type="text"
                placeholder="e.g. GM, Havells, Schneider Electric"
                value={currentItem.company}
                onChange={(e) => {
                  updateCurrentItem({ company: e.target.value });
                  if (validationErrors.company) setValidationErrors((prev) => ({ ...prev, company: undefined }));
                }}
                className="input-base"
                style={{
                  borderColor: validationErrors.company ? '#EF4444' : undefined,
                }}
              />
              {validationErrors.company && (
                <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, marginTop: '3px', display: 'block' }}>
                  {validationErrors.company}
                </span>
              )}
            </div>
          </div>

          {/* 3. Unit Price & Quantity/Unit Row */}
          <div className="modal-grid-2col">
            {/* Unit Price */}
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Unit Price (₹ Rate) <span style={{ color: '#EF4444', fontWeight: 700 }}>*</span>
              </label>
              <input
                ref={unitPriceRef}
                type="number"
                min="0"
                step="any"
                placeholder="₹ Rate"
                value={currentItem.price}
                onChange={(e) => {
                  updateCurrentItem({
                    price: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0),
                  });
                  if (validationErrors.price) setValidationErrors((prev) => ({ ...prev, price: undefined }));
                }}
                className="input-base"
                style={{
                  height: '40px',
                  boxShadow: 'var(--shadow-hard-xs)',
                  borderColor: validationErrors.price ? '#EF4444' : undefined,
                }}
              />
              {validationErrors.price && (
                <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600, marginTop: '3px', display: 'block' }}>
                  {validationErrors.price}
                </span>
              )}
            </div>

            {/* Quantity and Unit Controls */}
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Quantity &amp; Unit
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'nowrap',
                  width: '100%',
                }}
              >
                {/* [ − ] button */}
                <button
                  type="button"
                  onClick={handleDecreaseQty}
                  disabled={typeof currentItem.qtyValue === 'number' && currentItem.qtyValue <= 1}
                  aria-label="Decrease quantity"
                  title="Decrease quantity by 1"
                  style={{
                    width: '36px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--color-border)',
                    boxShadow: 'var(--shadow-hard-xs)',
                    background: 'var(--bg-surface)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor:
                      typeof currentItem.qtyValue === 'number' && currentItem.qtyValue <= 1
                        ? 'not-allowed'
                        : 'pointer',
                    opacity: typeof currentItem.qtyValue === 'number' && currentItem.qtyValue <= 1 ? 0.45 : 1,
                    flexShrink: 0,
                  }}
                >
                  <Minus size={15} strokeWidth={2.5} />
                </button>

                {/* [ quantity ] input */}
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Qty"
                  value={currentItem.qtyValue}
                  aria-label="Quantity"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      updateCurrentItem({ qtyValue: '' });
                    } else {
                      const num = parseFloat(val);
                      updateCurrentItem({ qtyValue: isNaN(num) ? '' : num });
                    }
                  }}
                  className="input-base"
                  style={{
                    height: '40px',
                    textAlign: 'center',
                    fontWeight: 700,
                    boxShadow: 'var(--shadow-hard-xs)',
                    borderRadius: 'var(--radius-sm)',
                    flex: 1,
                    minWidth: '44px',
                    padding: '0 4px',
                  }}
                />

                {/* [ + ] button */}
                <button
                  type="button"
                  onClick={handleIncreaseQty}
                  aria-label="Increase quantity"
                  title="Increase quantity by 1"
                  style={{
                    width: '36px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--color-border)',
                    boxShadow: 'var(--shadow-hard-xs)',
                    background: 'var(--bg-surface)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>

                {/* [ unit dropdown ] */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <select
                    value={currentItem.qtyUnit}
                    onChange={(e) => updateCurrentItem({ qtyUnit: e.target.value })}
                    aria-label="Unit of measurement"
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      height: '40px',
                      padding: '0 26px 0 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px solid var(--color-border)',
                      boxShadow: 'var(--shadow-hard-xs)',
                      background: 'var(--bg-surface)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-serif)',
                      cursor: 'pointer',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    {SUPPORTED_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      position: 'absolute',
                      right: '7px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <ChevronDown size={14} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
              {isAIMode && currentItem.qtyValue === '' && (
                <span style={fieldHintStyle}>Not detected — enter quantity</span>
              )}
            </div>
          </div>

          {/* Optional Invoice Number for explicit invoice uploads */}
          {showInvoiceFields && (
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Invoice / Bill Number
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-001"
                value={currentItem.invoiceNumber}
                onChange={(e) => updateCurrentItem({ invoiceNumber: e.target.value })}
                className="input-base"
                style={{ height: '40px' }}
              />
              {isAIMode && !currentItem.invoiceNumber.trim() && (
                <span style={fieldHintStyle}>Not detected / optional</span>
              )}
            </div>
          )}

          {/* Integrated GST and Price Summary Panel */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hard-xs)',
              padding: '14px 16px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Top row: GST Checkbox and inline Rate Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={currentItem.isGSTInvoice}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateCurrentItem({
                      isGSTInvoice: checked,
                      gstRate: checked
                        ? typeof currentItem.gstRate === 'number' && !isNaN(currentItem.gstRate)
                          ? currentItem.gstRate
                          : 18
                        : currentItem.gstRate,
                    });
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: '#2563EB',
                  }}
                />
                <span>Apply GST</span>
              </label>

              {/* Rate selector only shown when GST is enabled */}
              {currentItem.isGSTInvoice && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    GST Rate:
                  </span>
                  <select
                    value={
                      typeof currentItem.gstRate === 'number' && !isNaN(currentItem.gstRate)
                        ? currentItem.gstRate
                        : 18
                    }
                    onChange={(e) =>
                      updateCurrentItem({
                        gstRate: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    aria-label="GST Rate"
                    style={{
                      height: '32px',
                      padding: '0 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--color-border)',
                      background: 'var(--bg-surface)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                    <option value={12}>12%</option>
                    <option value={5}>5%</option>
                    <option value={0}>0%</option>
                  </select>
                </div>
              )}
            </div>

            {/* Bottom row: Breakdown & Prominent Final Total */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '10px',
                borderTop: '1.5px solid var(--color-border)',
              }}
            >
              {/* Subtotal & GST amount breakdown */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <span>Subtotal: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {hasCalculableTotal ? `₹${formatCurrency(subtotal)}` : '—'}
                  </span>
                </div>
                {currentItem.isGSTInvoice && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      marginTop: '2px',
                    }}
                  >
                    <span>GST ({effectiveGstRate}%): </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                      {hasCalculableTotal ? `+₹${formatCurrency(gstAmount)}` : '—'}
                    </span>
                  </div>
                )}
              </div>

              {/* Bold, prominent final total */}
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {currentItem.isGSTInvoice ? 'Total (incl. GST)' : 'Total'}
                </div>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: 900,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-serif)',
                    lineHeight: '1.2',
                    marginTop: '2px',
                  }}
                >
                  {hasCalculableTotal ? `₹${formatCurrency(netTotal)}` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                background: '#FEE2E2',
                border: '2px solid #EF4444',
                color: '#991B1B',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="btn btn-secondary"
              style={{ flex: 1, height: '42px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 1, height: '42px', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  <span>
                    {isAIMode
                      ? items.length > 1
                        ? `Confirm all ${items.length} items`
                        : 'Confirm & save material'
                      : 'Add material'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Photo & Document Proof Modal */}
      <PhotoPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        photoUrl={currentItem.photoUrl || initialData?.photoUrl}
        title={currentItem.item || 'Attached Document Proof'}
        vendor={currentItem.vendor}
        date={currentItem.date}
      />
    </div>
  );
};
