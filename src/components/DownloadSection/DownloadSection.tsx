// src/components/DownloadSection/DownloadSection.tsx
import React from 'react';
import { DownloadCloud, FileSpreadsheet, FileText, FileCode, Calendar, AlertCircle } from 'lucide-react';
import { useDownload, PresetRange, ExportFormat } from '@/hooks/useDownload';
import { PurchaseRecord } from '@/types';

interface DownloadSectionProps {
  purchases: PurchaseRecord[];
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({ purchases }) => {
  const {
    datePreset,
    applyPreset,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    format,
    setFormat,
    isExporting,
    exportData,
    filteredCount,
    isDateRangeInvalid,
  } = useDownload(purchases);

  const presets: { id: PresetRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7days', label: 'Last 7 days' },
    { id: '30days', label: 'Last 30 days' },
  ];

  const formats: { id: ExportFormat; label: string; icon: React.ReactNode }[] = [
    { id: 'xlsx', label: 'XLSX (Excel)', icon: <FileSpreadsheet size={16} /> },
    { id: 'pdf', label: 'PDF Statement', icon: <FileText size={16} /> },
    { id: 'csv', label: 'CSV Data', icon: <FileCode size={16} /> },
  ];

  return (
    <section className="card" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '2px solid var(--color-border)',
      }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
            Export statement
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Select a date range and download your purchase records.
          </p>
        </div>

        <div className="badge badge-warning" style={{ backgroundColor: 'var(--color-butter-yellow)', color: '#202020' }}>
          {filteredCount} of {purchases.length} records selected
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* A. Record Selection Status */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '2px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-hard-xs)',
          padding: '12px 14px',
          fontSize: '13px',
        }}>
          {purchases.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              No purchase records exist yet. Capture an invoice or add materials above to generate records for export.
            </p>
          ) : filteredCount === 0 && !isDateRangeInvalid ? (
            <p style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <AlertCircle size={16} color="var(--color-error)" />
              <span>No records match the selected date range ({startDate} to {endDate}). Try widening your date range.</span>
            </p>
          ) : isDateRangeInvalid ? (
            <p style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <AlertCircle size={16} color="var(--color-error)" />
              <span>Start date cannot be after end date. Please adjust the date fields.</span>
            </p>
          ) : (
            <p style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
              {filteredCount} {filteredCount === 1 ? 'record' : 'records'} eligible for export between{' '}
              <span className="mono">{startDate}</span> and <span className="mono">{endDate}</span>.
            </p>
          )}
        </div>

        {/* B. Date Range Section */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-serif)',
            marginBottom: '8px',
          }}>
            <Calendar size={15} strokeWidth={2.5} color="#202020" />
            <span>Date range</span>
          </label>

          {/* Practical Presets Segmented Control: Purple for selected preset, White for unselected */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '8px',
            marginBottom: '10px',
            width: '100%',
          }}>
            {presets.map((preset) => {
              const isActive = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: '2px solid var(--color-border)',
                    background: isActive ? 'var(--color-primary-selected)' : 'var(--bg-surface)',
                    color: '#202020',
                    boxShadow: isActive ? 'var(--shadow-hard-xs)' : 'none',
                    fontSize: '12px',
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Synchronized From & To Date Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', width: '100%' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                From date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  applyPreset('custom');
                }}
                className="input-base"
                style={{
                  height: '40px',
                  fontSize: '13px',
                  padding: '0 8px',
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  border: '2px solid var(--color-border)',
                  borderColor: isDateRangeInvalid ? 'var(--color-error)' : 'var(--color-border)',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                To date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  applyPreset('custom');
                }}
                className="input-base"
                style={{
                  height: '40px',
                  fontSize: '13px',
                  padding: '0 8px',
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  border: '2px solid var(--color-border)',
                  borderColor: isDateRangeInvalid ? 'var(--color-error)' : 'var(--color-border)',
                }}
              />
            </div>
          </div>
        </div>

        {/* C. Export Format Selection: Purple for selected, White for unselected */}
        <div>
          <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', display: 'block', marginBottom: '8px' }}>
            Export format
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '8px',
            width: '100%',
          }}>
            {formats.map((fmt) => {
              const isSelected = format === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id)}
                  style={{
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--color-border)',
                    background: isSelected ? 'var(--color-primary-selected)' : 'var(--bg-surface)',
                    color: '#202020',
                    boxShadow: isSelected ? 'var(--shadow-hard-xs)' : 'none',
                    fontSize: '13px',
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '0 4px',
                    minWidth: 0,
                    transition: 'all 0.1s ease',
                  }}
                >
                  {fmt.icon}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fmt.id.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* D. Download Action Button */}
        <div style={{ paddingTop: '6px' }}>
          <button
            type="button"
            onClick={exportData}
            disabled={isExporting || filteredCount === 0 || isDateRangeInvalid}
            className="btn btn-primary"
            style={{
              height: '46px',
              width: '100%',
              fontSize: '15px',
              fontWeight: 700,
            }}
          >
            {isExporting ? (
              <>
                <div className="animate-spin">⟳</div>
                <span>Generating {format.toUpperCase()} statement...</span>
              </>
            ) : isDateRangeInvalid ? (
              <span>Invalid date range</span>
            ) : filteredCount === 0 ? (
              <span>No records available to export</span>
            ) : (
              <>
                <DownloadCloud size={18} strokeWidth={2.5} />
                <span>
                  Download statement ({format.toUpperCase()} · {filteredCount} {filteredCount === 1 ? 'record' : 'records'})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
