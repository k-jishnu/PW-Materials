// src/components/PurchaseHistory/HistorySection.tsx
import React, { useState } from 'react';
import { PurchaseRecord } from '@/types';
import { Search, Filter, Eye, Trash2, ArrowUpRight, TrendingUp, Receipt, Building2, X } from 'lucide-react';

interface HistorySectionProps {
  purchases: PurchaseRecord[];
  onDeletePurchase: (id: string) => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  purchases,
  onDeletePurchase,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Unique vendors list for dropdown filter
  const vendors = Array.from(new Set(purchases.map((p) => p.vendor).filter(Boolean)));

  // Filtered purchases
  const filtered = purchases.filter((p) => {
    const matchesSearch =
      p.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.company && p.company.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesVendor = selectedVendor === 'all' || p.vendor === selectedVendor;

    return matchesSearch && matchesVendor;
  });

  // Calculate Summary Metrics
  const totalSpend = filtered.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
  const totalGST = filtered.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
  const totalAI = filtered.filter((p) => p.aiRecognized).length;
  const aiPercentage = filtered.length > 0 ? Math.round((totalAI / filtered.length) * 100) : 0;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Photo Preview Lightbox Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #E2E8F0',
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                {previewPhoto.title}
              </span>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="btn-icon"
                style={{ width: '32px', height: '32px' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'center', background: '#F8FAFC' }}>
              <img
                src={previewPhoto.url}
                alt="Invoice or receipt proof"
                style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: '10px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🏛️</span>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
              Purchase History &amp; Bank Statement
            </h3>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Track item purchases, debit records, and GST input credit claimable
          </p>
        </div>
      </div>

      {/* Financial Summary Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
      }}>
        {/* Card 1: Total Spend */}
        <div className="card-white" style={{
          borderLeft: '4px solid #2563EB',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Total Material Spend</span>
            <TrendingUp size={16} color="#2563EB" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
            ₹{totalSpend.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>{filtered.length} total purchase transactions</span>
        </div>

        {/* Card 2: GST Input Credit */}
        <div className="card-white" style={{
          borderLeft: '4px solid #10B981',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Claimable Input GST</span>
            <Receipt size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803D' }}>
            ₹{totalGST.toLocaleString('en-IN')}
          </div>
          <span style={{ fontSize: '11px', color: '#15803D' }}>Eligible for GST tax deduction</span>
        </div>

        {/* Card 3: AI Recognized Ratio */}
        <div className="card-white" style={{
          borderLeft: '4px solid #8B5CF6',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>AI Vision Precision</span>
            <Building2 size={16} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#6D28D9' }}>
            {aiPercentage}%
          </div>
          <span style={{ fontSize: '11px', color: '#64748B' }}>{totalAI} items auto-extracted from photos</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        background: '#FFFFFF',
        padding: '12px',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
      }}>
        <div style={{
          position: 'relative',
          flex: '1 1 240px',
        }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search purchases, vendor, item or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base"
            style={{ paddingLeft: '36px', height: '42px', fontSize: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#64748B" />
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            style={{
              height: '42px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1.5px solid #E2E8F0',
              background: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Vendors ({vendors.length})</option>
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statement Transactions Table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        overflowX: 'auto',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '12px', color: '#475569' }}>
              <th style={{ padding: '12px 14px', fontWeight: 700 }}>Date</th>
              <th style={{ padding: '12px 14px', fontWeight: 700 }}>Item &amp; Description</th>
              <th style={{ padding: '12px 14px', fontWeight: 700 }}>Vendor / Supplier</th>
              <th style={{ padding: '12px 14px', fontWeight: 700 }}>Quantity</th>
              <th style={{ padding: '12px 14px', fontWeight: 700 }}>GST Tax</th>
              <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'right' }}>Debit Total (₹)</th>
              <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Proof</th>
              <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                  No matching purchase statement records found.
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr
                  key={record.id}
                  style={{
                    borderBottom: '1px solid #F1F5F9',
                    fontSize: '13px',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  {/* Date Column */}
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{record.date}</div>
                    <span className="mono" style={{ fontSize: '10px', color: '#94A3B8' }}>{record.sku}</span>
                  </td>

                  {/* Item Description */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{record.item}</div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      {record.company || 'PW Materials'}
                    </span>
                  </td>

                  {/* Vendor */}
                  <td style={{ padding: '12px 14px', color: '#334155' }}>
                    <div style={{ fontWeight: 500 }}>{record.vendor}</div>
                    {record.aiRecognized && (
                      <span style={{ fontSize: '10px', color: '#7C3AED', fontWeight: 600 }}>
                        ✦ AI Verified ({Math.round((record.confidenceAverage || 0.9) * 100)}%)
                      </span>
                    )}
                  </td>

                  {/* Quantity */}
                  <td style={{ padding: '12px 14px', color: '#334155', fontWeight: 500 }}>
                    {record.quantity} {record.unit}
                  </td>

                  {/* GST */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: record.isGSTInvoice ? '#DCFCE7' : '#FEF3C7',
                        color: record.isGSTInvoice ? '#166534' : '#92400E',
                        width: 'fit-content',
                      }}>
                        {record.isGSTInvoice ? `GST ${record.gstRate}%` : 'Non-GST'}
                      </span>
                      {record.gstAmount > 0 && (
                        <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
                          +₹{record.gstAmount.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Net Debit Total (Bank statement style) */}
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      -₹{record.netAmount.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      (Rate: ₹{record.unitPrice.toLocaleString('en-IN')})
                    </span>
                  </td>

                  {/* Photo Preview Thumbnail */}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    {record.photoUrl ? (
                      <button
                        onClick={() => setPreviewPhoto({ url: record.photoUrl!, title: record.item })}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          padding: 0,
                          background: '#F1F5F9',
                        }}
                        title="View bill photo / proof"
                      >
                        <img
                          src={record.photoUrl}
                          alt="Bill"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </button>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '12px' }}>-</span>
                    )}
                  </td>

                  {/* Delete action */}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        if (confirm(`Delete purchase record for "${record.item}"?`)) {
                          onDeletePurchase(record.id);
                        }
                      }}
                      className="btn-icon"
                      style={{ width: '32px', height: '32px', color: '#EF4444' }}
                      title="Delete record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
