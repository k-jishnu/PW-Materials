// src/pages/CapturePage.tsx
//
// Page 1: Capture
// Dedicated landing page focused exclusively on capturing and uploading
// material photographs and invoices, with image cropping, AI extraction, and review.
//

import React from 'react';
import { PhotoCapture } from '@/components/PhotoSection/PhotoCapture';
import { Camera, Sparkles, ShieldCheck } from 'lucide-react';

interface CapturePageProps {
  onPhotoProcessed: (imageBase64: string) => Promise<void>;
  isProcessing: boolean;
  processingProgress: number;
  processingStage?: string;
  processingStatusMessage?: string;
  processingElapsedSeconds?: number;
  onCancelProcessing?: () => void;
  recognitionError?: string | null;
  onClearError?: () => void;
  onManualEntryWithPhoto?: (photoUrl: string) => void;
}

export const CapturePage: React.FC<CapturePageProps> = ({
  onPhotoProcessed,
  isProcessing,
  processingProgress,
  processingStage,
  processingStatusMessage,
  processingElapsedSeconds,
  onCancelProcessing,
  recognitionError,
  onClearError,
  onManualEntryWithPhoto,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Primary Capture Component with native camera priority & cropping */}
      <PhotoCapture
        onPhotoProcessed={onPhotoProcessed}
        isProcessing={isProcessing}
        processingProgress={processingProgress}
        processingStage={processingStage}
        processingStatusMessage={processingStatusMessage}
        processingElapsedSeconds={processingElapsedSeconds}
        onCancelProcessing={onCancelProcessing}
        recognitionError={recognitionError}
        onClearError={onClearError}
        onManualEntryWithPhoto={onManualEntryWithPhoto}
      />

      {/* Helpful Guidelines Card */}
      <div
        className="card"
        style={{
          background: 'var(--bg-surface)',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--color-primary)" />
          <h3 style={{ fontSize: '15px', fontWeight: 900, margin: 0, fontFamily: 'var(--font-serif)' }}>
            Capture & AI Recognition Tips
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              📸 Material Labels & Packs
            </strong>
            Take a clear photo showing brand name, product title, and specifications. Use the crop tool to isolate the label.
          </div>

          <div
            style={{
              background: 'var(--bg-card)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
            }}
          >
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
              🧾 Invoices & Bills
            </strong>
            Lay invoices flat with good lighting. Line items, quantities, GST rates, and supplier details are automatically detected.
          </div>
        </div>
      </div>
    </div>
  );
};

