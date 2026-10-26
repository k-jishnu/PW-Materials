// src/components/MaterialsList/PhotoPreviewModal.tsx
import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ExternalLink,
  Download,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  ZoomIn,
} from 'lucide-react';
import {
  getPhoto,
  StoredPhotoRecord,
  isPdfDocument,
  dataUrlToBlob,
} from '@/services/localPhotoStorage';

interface PhotoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string | null;
  title: string;
  sku?: string;
  date?: string;
  vendor?: string;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title,
  sku,
  date,
  vendor,
}) => {
  const [photoRecord, setPhotoRecord] = useState<StoredPhotoRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhotoRecord(null);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    let isMounted = true;
    setLoading(true);

    getPhoto(photoUrl)
      .then((rec) => {
        if (!isMounted) return;
        setPhotoRecord(rec);
        if (rec?.data) {
          try {
            const blob = dataUrlToBlob(rec.data);
            const url = URL.createObjectURL(blob);
            setBlobUrl(url);
          } catch (e) {
            console.warn('Failed to convert data URL to blob:', e);
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching photo from storage:', err);
        if (isMounted) setPhotoRecord(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, photoUrl]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPdf =
    isPdfDocument(photoRecord?.mimeType) ||
    isPdfDocument(photoUrl) ||
    isPdfDocument(photoRecord?.data);

  const handleOpenInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    } else if (photoRecord?.data) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${photoRecord.data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = blobUrl || photoRecord?.data || '';
    link.download = photoRecord?.fileName || (isPdf ? `${sku || 'document'}.pdf` : `${sku || 'photo'}.jpg`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          border: '3px solid var(--color-border)',
          boxShadow: 'var(--shadow-hard)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '2.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-logo-bg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: isPdf ? 'var(--color-accent-blue)' : 'var(--color-yellow)',
                border: '1.5px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#202020',
                flexShrink: 0,
              }}
            >
              {isPdf ? <FileText size={17} strokeWidth={2.5} /> : <ImageIcon size={17} strokeWidth={2.5} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-serif)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '280px',
                  }}
                  title={title}
                >
                  {title}
                </span>
                {sku && (
                  <span
                    className="mono"
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#FFFFFF',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {sku}
                  </span>
                )}
              </div>
              {(vendor || date) && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {vendor ? `Supplier: ${vendor}` : ''}
                  {vendor && date ? ' • ' : ''}
                  {date ? `Date: ${date}` : ''}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px', flexShrink: 0 }}
            aria-label="Close photo preview"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '280px',
            backgroundColor: '#F8FAFC',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Loading original photo...
              </span>
            </div>
          ) : !photoRecord || !photoRecord.data ? (
            /* Empty state when no photo was attached */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '30px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#E2E8F0',
                  border: '2px dashed var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <ImageIcon size={26} strokeWidth={2} />
              </div>
              <div>
                <h4
                  style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                  }}
                >
                  No photo attached
                </h4>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    maxWidth: '320px',
                  }}
                >
                  This material record does not have an attached photo or document. Photos are saved
                  automatically when captured or uploaded via AI.
                </p>
              </div>
            </div>
          ) : isPdf ? (
            /* PDF Document Viewer / Action Card */
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  padding: '24px 20px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  boxShadow: 'var(--shadow-hard-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-accent-blue)',
                    border: '2px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#202020',
                    boxShadow: '2px 2px 0 var(--color-border)',
                  }}
                >
                  <FileText size={32} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                    PDF Invoice Document
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Original uploaded invoice document attached to this material entry.
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    width: '100%',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    marginTop: '8px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="btn btn-primary"
                    style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
                  >
                    <ExternalLink size={15} strokeWidth={2.2} />
                    <span>Open in New Window</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn btn-secondary"
                    style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
                  >
                    <Download size={15} strokeWidth={2.2} />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* Embedded frame for browsers supporting embedded PDF */}
              {blobUrl && (
                <div
                  style={{
                    width: '100%',
                    height: '340px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--color-border)',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                  }}
                >
                  <iframe
                    src={blobUrl}
                    title="Invoice PDF Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Image Preview */
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxHeight: '62vh',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid var(--color-border)',
                  overflow: 'hidden',
                  background: '#000000',
                  boxShadow: 'var(--shadow-hard-sm)',
                }}
              >
                <img
                  src={blobUrl || photoRecord.data}
                  alt={title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '62vh',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>

              {/* Image Actions Bar */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                >
                  <ExternalLink size={13} strokeWidth={2.2} />
                  <span>Open Full Resolution</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '32px', padding: '0 12px', fontSize: '12px' }}
                >
                  <Download size={13} strokeWidth={2.2} />
                  <span>Download Image</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info strip */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '2px solid var(--color-border)',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Saved in Local Device Storage (IndexedDB)</span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{ height: '28px', padding: '0 12px', fontSize: '11px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
