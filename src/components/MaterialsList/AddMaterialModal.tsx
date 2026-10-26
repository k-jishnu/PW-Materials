import React, { useState } from 'react';
import { X, Plus, Minus, Check, ChevronDown } from 'lucide-react';

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    item: string;
    vendor: string;
    price: number;
    company: string;
    qtyValue: number;
    qtyUnit: string;
    gstRate: number;
    isGSTInvoice: boolean;
  }) => Promise<{ success: boolean; error?: string } | void> | void;
}

export const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [item, setItem] = useState('');
  const [vendor, setVendor] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const company = 'PW'; // Kept internally for database consistency
  const [qtyValue, setQtyValue] = useState<number | ''>(1);
  const [qtyUnit, setQtyUnit] = useState<string>("no's");
  const [isGSTInvoice, setIsGSTInvoice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setItem('');
    setVendor('');
    setPrice('');
    setQtyValue(1);
    setQtyUnit("no's");
    setIsGSTInvoice(true);
    setErrorMessage(null);
    onClose();
  };

  const handleDecreaseQty = () => {
    const current = typeof qtyValue === 'number' && !isNaN(qtyValue) ? qtyValue : 1;
    setQtyValue(Math.max(1, Math.round(current) - 1));
  };

  const handleIncreaseQty = () => {
    const current = typeof qtyValue === 'number' && !isNaN(qtyValue) ? qtyValue : 0;
    setQtyValue(Math.max(1, Math.round(current) + 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!item.trim()) {
      setErrorMessage('Material Description / Name is required.');
      return;
    }
    if (!vendor.trim()) {
      setErrorMessage('Supplier / Vendor is required.');
      return;
    }
    if (price === '' || Number(price) < 0) {
      setErrorMessage('Valid unit price is required (0 or greater).');
      return;
    }
    if (qtyValue === '' || Number(qtyValue) < 1) {
      setErrorMessage('Quantity must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onAdd({
        item: item.trim(),
        vendor: vendor.trim(),
        price: Number(price) || 0,
        company: company || 'PW',
        qtyValue: Number(qtyValue) || 1,
        qtyUnit: qtyUnit.trim() || "no's",
        gstRate: isGSTInvoice ? 18 : 0,
        isGSTInvoice,
      });

      if (res && typeof res === 'object' && res.success === false) {
        setErrorMessage(res.error || 'Failed to save material to Supabase.');
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(32, 32, 32, 0.55)',
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
          maxWidth: '500px',
          boxShadow: 'var(--shadow-hard-lg)',
          overflow: 'hidden',
          border: '2.5px solid var(--color-border)',
          boxSizing: 'border-box',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-logo-bg)',
                border: '2px solid var(--color-border)',
                boxShadow: 'var(--shadow-hard-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#202020',
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 900,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              Add material
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px' }}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
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
                marginBottom: '6px',
              }}
            >
              Material Description / Name <span style={{ color: '#EF4444', fontWeight: 700 }} aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 12mm TMT Steel Rebar Fe550"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="input-base"
              autoFocus
            />
          </div>

          {/* 2. Supplier / Vendor */}
          <div>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Supplier / Vendor <span style={{ color: '#EF4444', fontWeight: 700 }} aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ABC Steel Corp"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="input-base"
            />
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
                  marginBottom: '6px',
                }}
              >
                Unit Price (₹) <span style={{ color: '#EF4444', fontWeight: 700 }} aria-hidden="true">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                placeholder="₹ Rate"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="input-base"
                style={{
                  height: '40px',
                  boxShadow: 'var(--shadow-hard-xs)',
                }}
              />
            </div>

            {/* Quantity and Unit Controls */}
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                Quantity &amp; Unit
              </label>
              {/* Order: [ − ] [ quantity ] [ + ] [ unit dropdown ] */}
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
                  disabled={typeof qtyValue === 'number' && qtyValue <= 1}
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
                    cursor: typeof qtyValue === 'number' && qtyValue <= 1 ? 'not-allowed' : 'pointer',
                    opacity: typeof qtyValue === 'number' && qtyValue <= 1 ? 0.45 : 1,
                    flexShrink: 0,
                    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                  }}
                >
                  <Minus size={15} strokeWidth={2.5} />
                </button>

                {/* [ quantity ] input */}
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={qtyValue}
                  aria-label="Quantity"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setQtyValue('');
                    } else {
                      const num = parseFloat(val);
                      setQtyValue(isNaN(num) ? '' : num);
                    }
                  }}
                  onBlur={() => {
                    if (qtyValue === '' || Number(qtyValue) < 1) {
                      setQtyValue(1);
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
                    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>

                {/* [ unit dropdown ] */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <select
                    value={qtyUnit}
                    onChange={(e) => setQtyUnit(e.target.value)}
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
                    <option value="no's">no's</option>
                    <option value="kg's">kg's</option>
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
            </div>
          </div>

          {/* 4. GST Tax Invoice (Single Compact Row: Fixed 18%) */}
          <div
            style={{
              background: 'var(--bg-surface-subtle)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-hard-xs)',
              display: 'flex',
              alignItems: 'center',
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
                width: '100%',
              }}
            >
              <input
                type="checkbox"
                checked={isGSTInvoice}
                onChange={(e) => setIsGSTInvoice(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: 'var(--color-primary, #C9A3F5)',
                }}
              />
              <span>Is GST Tax Invoice</span>
              {isGSTInvoice && (
                <span
                  style={{
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-serif)',
                  }}
                >
                  : 18%
                </span>
              )}
            </label>
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
              <span>⚠️</span>
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
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 1, opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Saving to Supabase...</span>
                </>
              ) : (
                <>
                  <Check size={16} strokeWidth={2.5} />
                  <span>Add material</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
