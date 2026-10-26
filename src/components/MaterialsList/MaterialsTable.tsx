// src/components/MaterialsList/MaterialsTable.tsx
import React, { useState, useMemo } from 'react';
import { Material } from '@/types';
import { MaterialCard } from './MaterialCard';
import { ConfidenceBadge } from './ConfidenceBadge';
import {
  Plus,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle,
  Trash2,
  Package,
  Search,
  Check,
} from 'lucide-react';

interface MaterialsTableProps {
  materials: Material[];
  onCommit?: (id: string) => void;
  onCommitAll?: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onUpdateField: (id: string, field: any, value: any) => void;
  onOpenAdd: () => void;
}

export const MaterialsTable: React.FC<MaterialsTableProps> = ({
  materials,
  onCommit = () => {},
  onCommitAll,
  onDelete,
  onDuplicate,
  onUpdateField,
  onOpenAdd,
}) => {
  // Default to card view on mobile, table view on desktop
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 768 ? 'card' : 'table';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [taxFilter, setTaxFilter] = useState<'all' | 'gst' | 'non-gst'>('all');
  const [sortField, setSortField] = useState<'item' | 'price' | 'vendor'>('item');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter & Search
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.item.value.toLowerCase().includes(q) ||
        m.vendor.value.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        m.company.value.toLowerCase().includes(q);

      const matchesTax =
        taxFilter === 'all' ||
        (taxFilter === 'gst' && m.gst.isGSTInvoice) ||
        (taxFilter === 'non-gst' && !m.gst.isGSTInvoice);

      return matchesSearch && matchesTax;
    });
  }, [materials, searchQuery, taxFilter]);

  // Sorting
  const sortedMaterials = useMemo(() => {
    return [...filteredMaterials].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'item') {
        comparison = a.item.value.localeCompare(b.item.value);
      } else if (sortField === 'vendor') {
        comparison = a.vendor.value.localeCompare(b.vendor.value);
      } else if (sortField === 'price') {
        const totalA = (a.price.value ?? 0) * (a.quantity.value.value ?? 0);
        const totalB = (b.price.value ?? 0) * (b.quantity.value.value ?? 0);
        comparison = totalA - totalB;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [filteredMaterials, sortField, sortAsc]);

  const toggleSort = (field: 'item' | 'price' | 'vendor') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* Section Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>Materials</h2>
            {materials.length > 0 && (
              <span className="badge badge-warning">
                {materials.length} {materials.length === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Review and manage your purchase records.
          </p>
        </div>

        {/* Toolbar primary action when records exist */}
        {materials.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onOpenAdd}
              className="btn btn-primary btn-sm"
              style={{ height: '36px' }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add material</span>
            </button>

            {
              materials.some((m) => m.status === 'draft') && (
                <button
                  type="button"
                  onClick={onCommitAll}
                  className="btn btn-success btn-sm"
                  style={{ height: '36px' }}
                  title="Confirm and save all drafts to local storage"
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Save all drafts ({materials.filter((m) => m.status === 'draft').length})</span>
                </button>
              )
            }
          </div>
        )}
      </div>

      {/* Compact Toolbar when materials exist */}
      {materials.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          background: 'var(--bg-card)',
          border: '2px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-hard-xs)',
          padding: '10px 12px',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}>
          {/* Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-surface)',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0 10px',
            height: '36px',
            flex: '1',
            minWidth: '200px',
            maxWidth: '360px',
          }}>
            <Search size={15} color="#202020" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search item, vendor, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                width: '100%',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-serif)',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Tax:</span>
              <select
                value={taxFilter}
                onChange={(e) => setTaxFilter(e.target.value as any)}
                style={{
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--color-border)',
                  background: 'var(--bg-surface)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-serif)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All tax types</option>
                <option value="gst">GST only</option>
                <option value="non-gst">Non-GST</option>
              </select>
            </div>

            {/* View Mode Toggle (Table / Card) */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              padding: '3px',
              borderRadius: 'var(--radius-sm)',
              border: '2px solid var(--color-border)',
              gap: '2px',
            }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '4px',
                  background: viewMode === 'table' ? 'var(--color-primary-selected)' : 'transparent',
                  color: '#202020',
                  border: viewMode === 'table' ? '1.5px solid var(--color-border)' : '1.5px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Table view"
                aria-label="Table view"
              >
                <TableIcon size={15} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '4px',
                  background: viewMode === 'card' ? 'var(--color-primary-selected)' : 'transparent',
                  color: '#202020',
                  border: viewMode === 'card' ? '1.5px solid var(--color-border)' : '1.5px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Card view"
                aria-label="Card view"
              >
                <LayoutGrid size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State: Compact Light Aqua card with light-yellow icon accent */}
      {materials.length === 0 && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '2.5px solid var(--color-border)',
          padding: '36px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          boxShadow: 'var(--shadow-hard)',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-logo-bg)',
            border: '2px solid var(--color-border)',
            boxShadow: 'var(--shadow-hard-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#202020',
          }}>
            <Package size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
              No materials yet
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '340px', margin: '4px auto 0' }}>
              Capture an invoice or add a material manually to get started.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAdd}
            className="btn btn-primary"
            style={{ height: '40px', padding: '0 20px', marginTop: '6px' }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add material</span>
          </button>
        </div>
      )}

      {/* Card-Based Layout (Default & Mobile Friendly) */}
      {viewMode === 'card' && materials.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
        }}>
          {sortedMaterials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onCommit={onCommit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onUpdateField={onUpdateField}
            />
          ))}
        </div>
      )}

      {/* Table-Based Layout (Desktop & Detailed view with Mobile Horizontal Scroll) */}
      {viewMode === 'table' && materials.length > 0 && (
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '2.5px solid var(--color-border)',
            boxShadow: 'var(--shadow-hard)',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {sortedMaterials.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No materials match your search criteria.
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setTaxFilter('all'); }}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-block', marginLeft: '10px' }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div
              className="table-scroll-container"
              style={{
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                <tr style={{ background: 'var(--color-logo-bg)', borderBottom: '2px solid var(--color-border)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>SKU</th>
                  <th
                    onClick={() => toggleSort('item')}
                    style={{ padding: '12px 14px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Material Item</span>
                      <ArrowUpDown size={13} strokeWidth={2.5} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('vendor')}
                    style={{ padding: '12px 14px', fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Vendor</span>
                      <ArrowUpDown size={13} strokeWidth={2.5} />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('price')}
                    style={{ padding: '12px 14px', fontWeight: 700, cursor: 'pointer', textAlign: 'right', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <span>Total (₹)</span>
                      <ArrowUpDown size={13} strokeWidth={2.5} />
                    </div>
                  </th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Quantity</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Tax</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Company</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedMaterials.map((mat) => {
                  const hasPrice = mat.price.value !== null;
                  const hasQty = mat.quantity.value.value !== null;
                  const sub = (mat.price.value ?? 0) * (mat.quantity.value.value ?? 0);
                  const gst = mat.gst.isGSTInvoice && mat.gst.rate !== null ? (sub * mat.gst.rate) / 100 : 0;
                  const net = sub + gst;

                  return (
                    <tr
                      key={mat.id}
                      style={{
                        borderBottom: '1.5px solid var(--color-border)',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <td className="mono" style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }}>
                        {mat.sku}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{mat.item.value}</span>
                          {mat.item.source === 'ai' && (
                            <ConfidenceBadge
                              confidence={mat.item.confidence}
                              score={mat.item.confidenceScore}
                              showIconOnly
                            />
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', color: mat.vendor.value ? 'var(--text-primary)' : '#94A3B8' }}>
                        {mat.vendor.value || '—'}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {hasPrice && hasQty ? `₹${net.toLocaleString('en-IN')}` : '₹--'}
                      </td>

                      <td style={{ padding: '12px 14px', color: hasQty ? 'var(--text-secondary)' : '#94A3B8' }}>
                        {hasQty ? `${mat.quantity.value.value} ${mat.quantity.value.unit}` : '—'}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span className={`badge ${mat.gst.rate !== null && mat.gst.isGSTInvoice ? 'badge-success' : 'badge-neutral'}`}>
                          {mat.gst.rate !== null ? (mat.gst.isGSTInvoice ? `GST ${mat.gst.rate}%` : `GST ${mat.gst.rate}% (Exempt)`) : '—'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {mat.company.value || 'PW'}
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          {mat.status === 'saved' ? (
                            <span
                              className="badge badge-success"
                              style={{ height: '28px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '0 8px' }}
                              title="Confirmed and saved locally"
                            >
                              <CheckCircle size={12} strokeWidth={2.5} />
                              <span>Saved</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onCommit(mat.id)}
                              className="btn btn-success btn-sm"
                              style={{ height: '30px', padding: '0 10px', fontSize: '12px' }}
                              title="Confirm and save to local storage"
                            >
                              <CheckCircle size={13} strokeWidth={2.5} />
                              <span>Save</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDelete(mat.id)}
                            className="btn-icon"
                            style={{ width: '30px', height: '30px', color: '#202020' }}
                            title="Delete item"
                            aria-label="Delete item"
                          >
                            <Trash2 size={13} strokeWidth={2.2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
