// src/components/MaterialsList/MaterialCard.tsx
import React, { useState } from 'react';
import { Material } from '@/types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { Edit3, Copy, Trash2, Check, ArrowRight, ShieldCheck } from 'lucide-react';

interface MaterialCardProps {
  material: Material;
  onCommit: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdateField: (id: string, field: any, value: any) => void;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  onCommit,
  onDelete,
  onDuplicate,
  onUpdateField,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState(material.item.value);
  const [editPrice, setEditPrice] = useState(material.price.value);
  const [editVendor, setEditVendor] = useState(material.vendor.value);
  const [editCompany, setEditCompany] = useState(material.company.value);
  const [editQty, setEditQty] = useState(material.quantity.value.value);
  const [editUnit, setEditUnit] = useState(material.quantity.value.unit);
  const [editGstRate, setEditGstRate] = useState(material.gst.rate);
  const [editIsGst, setEditIsGst] = useState(material.gst.isGSTInvoice);

  const handleSaveEdit = () => {
    onUpdateField(material.id, 'item', editItem);
    onUpdateField(material.id, 'price', editPrice);
    onUpdateField(material.id, 'vendor', editVendor);
    onUpdateField(material.id, 'company', editCompany);
    onUpdateField(material.id, 'quantity', { value: editQty, unit: editUnit });
    onUpdateField(material.id, 'gst', { rate: editGstRate, isGSTInvoice: editIsGst });
    setIsEditing(false);
  };

  const subTotal = material.price.value * material.quantity.value.value;
  const gstAmount = material.gst.isGSTInvoice ? (subTotal * material.gst.rate) / 100 : 0;
  const netTotal = subTotal + gstAmount;

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        border: '2.5px solid var(--color-border)',
        padding: '16px',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-hard)',
      }}
    >
      {/* Top Bar: SKU + AI Confidence + Photo thumbnail */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="mono" style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 8px',
            background: 'var(--color-yellow)',
            borderRadius: 'var(--radius-sm)',
            color: '#202020',
            border: '1.5px solid var(--color-border)',
            boxShadow: '1.5px 1.5px 0 var(--color-border)',
          }}>
            {material.sku}
          </span>
          {material.item.source === 'ai' && (
            <ConfidenceBadge
              confidence={material.item.confidence}
              score={material.item.confidenceScore}
            />
          )}
        </div>

        {material.photoUrl && (
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            border: '2px solid var(--color-border)',
            boxShadow: '1.5px 1.5px 0 var(--color-border)',
            background: 'var(--bg-surface-subtle)',
          }}>
            <img
              src={material.photoUrl}
              alt={material.item.value}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}
      </div>

      {isEditing ? (
        /* Inline Edit Form */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Item Description</label>
            <input
              type="text"
              value={editItem}
              onChange={(e) => setEditItem(e.target.value)}
              className="input-base"
              style={{ height: '40px', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Unit Rate (₹)</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(Number(e.target.value))}
                className="input-base"
                style={{ height: '40px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Quantity &amp; Unit</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(Number(e.target.value))}
                  className="input-base"
                  style={{ height: '40px', fontSize: '14px', flex: 1 }}
                />
                <input
                  type="text"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  className="input-base"
                  style={{ height: '40px', fontSize: '14px', width: '60px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Vendor</label>
              <input
                type="text"
                value={editVendor}
                onChange={(e) => setEditVendor(e.target.value)}
                className="input-base"
                style={{ height: '40px', fontSize: '14px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Company Reference</label>
              <input
                type="text"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                className="input-base"
                style={{ height: '40px', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                id={`gst-toggle-${material.id}`}
                checked={editIsGst}
                onChange={(e) => setEditIsGst(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor={`gst-toggle-${material.id}`} style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                GST Invoice
              </label>
            </div>
            {editIsGst && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#64748B' }}>Rate:</label>
                <select
                  value={editGstRate}
                  onChange={(e) => setEditGstRate(Number(e.target.value))}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    fontWeight: 600,
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

          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-secondary"
              style={{ flex: 1, height: '38px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="btn btn-primary"
              style={{ flex: 1, height: '38px', fontSize: '13px' }}
            >
              <Check size={14} />
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        /* Regular Card Presentation (Mobile-first pattern) */
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', flex: 1 }}>
              {material.item.value}
            </h4>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#202020', fontFamily: 'var(--font-serif)', whiteSpace: 'nowrap' }}>
                ₹{netTotal.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Rate: ₹{material.price.value.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Key-Value Details */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingTop: '8px',
            borderTop: '1.5px solid var(--color-border)',
            fontSize: '13px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Vendor:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{material.vendor.value}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Quantity:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                {material.quantity.value.value} {material.quantity.value.unit}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>GST Tax:</span>
              <span className={`badge ${material.gst.isGSTInvoice ? 'badge-success' : 'badge-neutral'}`}>
                {material.gst.isGSTInvoice ? `GST ${material.gst.rate}% (+₹${gstAmount.toLocaleString('en-IN')})` : 'Non-GST'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Company Ref:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{material.company.value}</span>
            </div>
          </div>

          {/* Card Actions: Commit, Edit, Duplicate, Delete */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            paddingTop: '10px',
            borderTop: '1.5px solid var(--color-border)',
          }}>
            <button
              type="button"
              onClick={() => onCommit(material.id)}
              className="btn btn-success btn-sm"
              style={{
                flex: 1,
                height: '36px',
                fontSize: '13px',
              }}
              title="Save to purchases"
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Save to purchases</span>
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn-icon"
                style={{ width: '36px', height: '36px' }}
                title="Edit item"
                aria-label="Edit item"
              >
                <Edit3 size={15} strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={() => onDuplicate(material.id)}
                className="btn-icon"
                style={{ width: '36px', height: '36px' }}
                title="Duplicate item"
                aria-label="Duplicate item"
              >
                <Copy size={15} strokeWidth={2.2} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete "${material.item.value}"?`)) {
                    onDelete(material.id);
                  }
                }}
                className="btn-icon"
                style={{ width: '36px', height: '36px', color: '#202020' }}
                title="Delete item"
                aria-label="Delete item"
              >
                <Trash2 size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
