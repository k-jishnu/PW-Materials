// src/components/MaterialsList/AddMaterialModal.tsx
import React, { useState } from 'react';
import { X, Plus, Check } from 'lucide-react';

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
  }) => void;
}

export const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [item, setItem] = useState('');
  const [vendor, setVendor] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [company, setCompany] = useState('PW Materials');
  const [qtyValue, setQtyValue] = useState<number | ''>(1);
  const [qtyUnit, setQtyUnit] = useState('Nos');
  const [gstRate, setGstRate] = useState(18);
  const [isGSTInvoice, setIsGSTInvoice] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !vendor.trim()) {
      alert('Please provide at least Material Name and Vendor.');
      return;
    }

    onAdd({
      item: item.trim(),
      vendor: vendor.trim(),
      price: Number(price) || 0,
      company: company.trim() || 'PW Materials',
      qtyValue: Number(qtyValue) || 1,
      qtyUnit: qtyUnit.trim() || 'Nos',
      gstRate: isGSTInvoice ? Number(gstRate) : 0,
      isGSTInvoice,
    });

    // Reset
    setItem('');
    setVendor('');
    setPrice('');
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(23, 43, 77, 0.45)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '480px',
        boxShadow: 'var(--shadow-hard-lg)',
        overflow: 'hidden',
        border: '2.5px solid var(--color-border)',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '2px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-yellow)',
              border: '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-hard-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#202020',
            }}>
              <Plus size={18} strokeWidth={2.5} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
              Add material
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px' }}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Material Description / Name *
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Supplier / Vendor *
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
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Company Reference
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Unit Price (₹) *
              </label>
              <input
                type="number"
                required
                placeholder="₹ Rate"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="input-base"
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Quantity &amp; Unit
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={qtyValue}
                  onChange={(e) => setQtyValue(Number(e.target.value))}
                  className="input-base"
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={qtyUnit}
                  onChange={(e) => setQtyUnit(e.target.value)}
                  className="input-base"
                  style={{ width: '80px' }}
                />
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface-subtle)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={isGSTInvoice}
                onChange={(e) => setIsGSTInvoice(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Is GST Tax Invoice</span>
            </label>

            {isGSTInvoice && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>GST Rate:</span>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                  }}
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              <Check size={15} />
              <span>Add material</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

