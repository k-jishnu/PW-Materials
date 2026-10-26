// src/components/MaterialsList/AddMaterialModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
  ChevronDown,
  Sparkles,
  Calendar,
  Building,
  FileText,
  AlertCircle,
  Package,
} from 'lucide-react';

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

  const [items, setItems] = useState<ReviewItemData[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form whenever modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData?.items && initialData.items.length > 0) {
        setItems(
          initialData.items.map((it) => ({
            item: it.item || '',
            vendor: it.vendor || '',
            price: typeof it.price === 'number' && !isNaN(it.price) ? it.price : '',
            company: it.company || 'PW',
            qtyValue: typeof it.qtyValue === 'number' && !isNaN(it.qtyValue) ? it.qtyValue : '',
            qtyUnit: it.qtyUnit || "no's",
            gstRate: typeof it.gstRate === 'number' && !isNaN(it.gstRate) ? it.gstRate : 18,
            isGSTInvoice: it.isGSTInvoice ?? true,
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
            company: 'PW',
            qtyValue: '',
            qtyUnit: "no's",
            gstRate: 18,
            isGSTInvoice: true,
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
    company: 'PW',
    qtyValue: '',
    qtyUnit: "no's",
    gstRate: 18,
    isGSTInvoice: true,
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
  const numericPrice = typeof currentItem.price === 'number' && !isNaN(currentItem.price) ? currentItem.price : 0;
  const numericQty = typeof currentItem.qtyValue === 'number' && !isNaN(currentItem.qtyValue) ? currentItem.qtyValue : 0;
  const subtotal = numericPrice * numericQty;
  const numericGstRate =
    currentItem.isGSTInvoice && typeof currentItem.gstRate === 'number' && !isNaN(currentItem.gstRate)
      ? currentItem.gstRate
      : 0;
  const gstAmount = currentItem.isGSTInvoice ? (subtotal * numericGstRate) / 100 : 0;
  const netTotal = subtotal + gstAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    // Validate that each item has a material description
    for (let i = 0; i < items.length; i++) {
      if (!items[i].item.trim()) {
        setActiveIndex(i);
        setErrorMessage(
          items.length > 1
            ? `Item #${i + 1} is missing Material Description / Name.`
            : 'Material Description / Name is required.'
        );
        return;
      }
      if (typeof items[i].price === 'number' && (items[i].price as number) < 0) {
        setActiveIndex(i);
        setErrorMessage(`Item #${i + 1} has an invalid negative unit price.`);
        return;
      }
      if (typeof items[i].qtyValue === 'number' && (items[i].qtyValue as number) < 0) {
        setActiveIndex(i);
        setErrorMessage(`Item #${i + 1} has an invalid negative quantity.`);
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
                background: isAIMode ? 'var(--color-yellow)' : 'var(--color-logo-bg)',
                border: '2px solid var(--color-border)',
                boxShadow: 'var(--shadow-hard-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#202020',
                flexShrink: 0,
              }}
            >
              {isAIMode ? <Sparkles size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                      ? `Review invoice materials (${items.length} items)`
                      : 'Review material'
                    : 'Add material'}
                </h3>
                {isAIMode && (
                  <span
                    className="badge badge-warning"
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      background: 'var(--color-butter-yellow)',
                      color: '#202020',
                    }}
                  >
                    AI Extracted · Review
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {isAIMode
                  ? 'Inspect and edit extracted fields before confirming to save.'
                  : 'Enter purchase details manually.'}
              </p>
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
                  onClick={() => setActiveIndex(idx)}
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
          {/* 1. Material Description / Name */}
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
              Material Description / Name <span style={{ color: '#EF4444', fontWeight: 700 }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 12mm TMT Steel Rebar Fe550"
              value={currentItem.item}
              onChange={(e) => updateCurrentItem({ item: e.target.value })}
              className="input-base"
              autoFocus
            />
            {isAIMode && !currentItem.item.trim() && (
              <span style={fieldHintStyle}>Not detected — enter material name</span>
            )}
          </div>

          {/* 2. Supplier / Vendor & Material Brand */}
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
                Supplier / Vendor
              </label>
              <input
                type="text"
                placeholder="e.g. ABC Steel Corp"
                value={currentItem.vendor}
                onChange={(e) => updateCurrentItem({ vendor: e.target.value })}
                className="input-base"
              />
              {isAIMode && !currentItem.vendor.trim() && (
                <span style={fieldHintStyle}>Not detected — enter manually</span>
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
                Material Brand / Company
              </label>
              <input
                type="text"
                placeholder="e.g. Tata Tiscon / UltraTech / PW"
                value={currentItem.company}
                onChange={(e) => updateCurrentItem({ company: e.target.value })}
                className="input-base"
              />
              {isAIMode && (!currentItem.company.trim() || currentItem.company === 'PW') && (
                <span style={fieldHintStyle}>e.g. UltraTech, Tata, or PW</span>
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
                Unit Price (₹ Rate)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="₹ Rate"
                value={currentItem.price}
                onChange={(e) =>
                  updateCurrentItem({
                    price: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="input-base"
                style={{ height: '40px', boxShadow: 'var(--shadow-hard-xs)' }}
              />
              {isAIMode && currentItem.price === '' && (
                <span style={fieldHintStyle}>Not detected — enter unit rate</span>
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

          {/* 4. Purchase Date & Invoice Number Row */}
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
                Purchase / Invoice Date
              </label>
              <input
                type="date"
                value={currentItem.date}
                onChange={(e) => updateCurrentItem({ date: e.target.value })}
                className="input-base"
                style={{ height: '40px' }}
              />
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
          </div>

          {/* 5. GST Tax Invoice & Rate Row */}
          <div
            style={{
              background: 'var(--bg-surface-subtle)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-hard-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              boxSizing: 'border-box',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={currentItem.isGSTInvoice}
                onChange={(e) => updateCurrentItem({ isGSTInvoice: e.target.checked })}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--color-primary, #C9A3F5)',
                }}
              />
              <span>Is GST Tax Invoice</span>
            </label>

            {currentItem.isGSTInvoice && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Rate (%):
                </span>
                <select
                  value={currentItem.gstRate}
                  onChange={(e) =>
                    updateCurrentItem({
                      gstRate: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  style={{
                    height: '34px',
                    padding: '0 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--bg-surface)',
                    fontSize: '13px',
                    fontWeight: 700,
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
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  (+₹{gstAmount.toLocaleString('en-IN')})
                </span>
              </div>
            )}
          </div>

          {/* 6. Dynamic Total Amount Calculation Card */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hard-xs)',
              padding: '12px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Calculated Total
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Subtotal: ₹{subtotal.toLocaleString('en-IN')}{' '}
                {currentItem.isGSTInvoice
                  ? `+ GST (${numericGstRate}%): ₹${gstAmount.toLocaleString('en-IN')}`
                  : '(Tax Exempt)'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-serif)',
                }}
              >
                {currentItem.price !== '' && currentItem.qtyValue !== ''
                  ? `₹${netTotal.toLocaleString('en-IN')}`
                  : '₹--'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {currentItem.price !== '' && currentItem.qtyValue !== ''
                  ? 'Net Total'
                  : 'Enter price & quantity'}
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
    </div>
  );
};
