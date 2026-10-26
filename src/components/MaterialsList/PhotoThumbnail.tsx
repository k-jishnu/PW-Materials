// src/components/MaterialsList/PhotoThumbnail.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Eye } from 'lucide-react';
import { getPhoto, isPdfDocument } from '@/services/localPhotoStorage';

interface PhotoThumbnailProps {
  photoUrl?: string | null;
  alt: string;
  size?: number;
  onClick?: () => void;
  showBadge?: boolean;
}

export const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  photoUrl,
  alt,
  size = 34,
  onClick,
  showBadge = true,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!photoUrl || !photoUrl.trim()) {
      setDataUrl(null);
      setIsPdf(false);
      return;
    }

    if (photoUrl.startsWith('data:')) {
      setDataUrl(photoUrl);
      setIsPdf(isPdfDocument(photoUrl));
      return;
    }

    let isMounted = true;
    setLoading(true);

    getPhoto(photoUrl)
      .then((record) => {
        if (!isMounted) return;
        if (record && record.data) {
          setDataUrl(record.data);
          setIsPdf(isPdfDocument(record.mimeType || record.data));
        } else {
          setDataUrl(null);
        }
      })
      .catch(() => {
        if (isMounted) setDataUrl(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [photoUrl]);

  if (!photoUrl) {
    return (
      <span
        style={{
          color: '#94A3B8',
          fontSize: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${size}px`,
          height: `${size}px`,
        }}
        title="No photo attached"
      >
        —
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="photo-thumb-btn"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        border: '2px solid var(--color-border)',
        boxShadow: '1.5px 1.5px 0 var(--color-border)',
        background: isPdf ? 'var(--color-accent-blue)' : '#FFFFFF',
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
      }}
      title={isPdf ? 'View PDF invoice document' : 'View original photo'}
      aria-label={isPdf ? 'View PDF invoice document' : 'View original photo'}
    >
      {loading ? (
        <div style={{ width: '100%', height: '100%', background: '#F1F5F9' }} />
      ) : isPdf ? (
        <FileText size={Math.round(size * 0.55)} strokeWidth={2.4} style={{ color: '#202020' }} />
      ) : dataUrl ? (
        <img
          src={dataUrl}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        <ImageIcon size={Math.round(size * 0.55)} strokeWidth={2} style={{ color: '#94A3B8' }} />
      )}

      {showBadge && isPdf && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            background: '#EF4444',
            color: '#FFFFFF',
            fontSize: '7px',
            fontWeight: 900,
            padding: '0 2px',
            lineHeight: '10px',
            borderRadius: '2px 0 0 0',
          }}
        >
          PDF
        </span>
      )}
    </button>
  );
};
