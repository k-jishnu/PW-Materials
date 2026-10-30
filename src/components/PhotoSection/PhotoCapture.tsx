import React, { useState } from 'react';
import { Camera, Upload, RotateCw, X, Sparkles, AlertCircle, RefreshCw, FileUp, FileText, CheckCircle2 } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';

interface PhotoCaptureProps {
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

function getStageBadgeLabel(stage?: string): string {
  switch (stage) {
    case 'preparing':
      return 'Preparing image';
    case 'validating':
      return 'Validating image';
    case 'connecting':
      return 'Connecting to AI';
    case 'analyzing':
      return 'Analyzing material';
    case 'extracting':
      return 'Extracting details';
    case 'validating_extracted':
      return 'Validating details';
    case 'preparing_review':
      return 'Preparing review';
    case 'complete':
      return 'Completed';
    default:
      return 'Processing';
  }
}

function formatElapsed(seconds: number = 0): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s} elapsed`;
}

function isRetryMessage(msg?: string): boolean {
  if (!msg) return false;
  const l = msg.toLowerCase();
  return l.includes('retrying') || l.includes('interruption') || l.includes('connection');
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
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
  const {
    videoRef,
    canvasRef,
    fileInputRef,
    nativeCameraInputRef,
    isCapturing,
    flashActive,
    cameraError,
    startCamera,
    stopCamera,
    capturePhoto,
    toggleFacingMode,
    triggerNativeCamera,
    triggerFileUpload,
    handleFileChange,
    clearCameraError,
  } = useCamera();

  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle take photo button click (with automatic mobile/HTTP fallback)
  const handleTakePhoto = () => {
    const hasMediaDevices =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!hasMediaDevices) {
      // Direct native camera on mobile / non-HTTPS LAN
      triggerNativeCamera();
    } else {
      startCamera();
    }
  };

  // Handle capture button click from live viewfinder
  const handleCapture = async () => {
    try {
      const base64 = await capturePhoto();
      setPreview(base64);
      await onPhotoProcessed(base64);
    } catch (e) {
      console.error('Capture failed:', e);
    }
  };

  // Handle file upload or native camera result
  const handleUploadedFile = async (base64: string) => {
    stopCamera();
    clearCameraError();
    setUploadError(null);
    setPreview(base64);
    await onPhotoProcessed(base64);
  };

  const handleFileError = (err: string) => {
    setUploadError(err);
    setPreview(null);
  };

  return (
    <section className="card" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Hidden canvas for taking video frames */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden file input for gallery/upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.pdf,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, handleUploadedFile, handleFileError)}
      />

      {/* Hidden native camera capture input for mobile devices and fallback */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, handleUploadedFile, handleFileError)}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
            Capture material
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Take a photo or upload an invoice to extract purchase details.
          </p>
        </div>

        {isCapturing && (
          <button
            type="button"
            onClick={stopCamera}
            className="btn-icon"
            title="Close camera"
            aria-label="Close camera"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Camera Live Viewfinder Area */}
      {isCapturing && (
        <div style={{
          position: 'relative',
          width: '100%',
          height: '320px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: '#0F172A',
          marginBottom: '16px',
          border: '2.5px solid var(--color-border)',
          boxShadow: 'var(--shadow-hard)',
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />

          {/* Flash Effect Overlay */}
          {flashActive && <div className="camera-flash-overlay" />}

          {/* Target Overlay guide box */}
          <div style={{
            position: 'absolute',
            inset: '24px',
            border: '2px dashed rgba(255, 255, 255, 0.6)',
            borderRadius: 'var(--radius-md)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '12px',
          }}>
            <span style={{
              background: 'rgba(15, 23, 42, 0.7)',
              color: '#FFFFFF',
              fontSize: '12px',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
            }}>
              Align invoice within frame
            </span>
          </div>

          {/* Camera On-Screen Controls */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            zIndex: 10,
          }}>
            <button
              type="button"
              onClick={toggleFacingMode}
              className="btn-icon"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
              title="Flip camera"
              aria-label="Flip camera"
            >
              <RotateCw size={16} />
            </button>

            {/* Shutter Button */}
            <button
              type="button"
              onClick={handleCapture}
              disabled={isProcessing}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '3px solid var(--color-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
              }}
              aria-label="Take picture"
            >
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
              }} />
            </button>

            <button
              type="button"
              onClick={stopCamera}
              className="btn-icon"
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
              title="Cancel"
              aria-label="Cancel"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. DEDICATED FIXED-SIZE EXTRACTION PANEL (When isProcessing)   */}
      {/* ------------------------------------------------------------- */}
      {isProcessing && (
        <div
          data-testid="extraction-container"
          style={{
            width: '100%',
            maxWidth: '520px',
            minHeight: '380px',
            maxHeight: '480px',
            margin: '0 auto 16px',
            padding: '24px 20px',
            background: 'var(--bg-surface)',
            border: '2.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-hard)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          {/* TOP: Small thumbnail & Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            {preview && (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '2px solid var(--color-border)',
                  background: 'var(--bg-surface-subtle)',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-hard-xs)',
                  flexShrink: 0,
                }}
              >
                {preview.startsWith('data:application/pdf') ? (
                  <FileText size={28} strokeWidth={2.5} color="var(--color-primary)" />
                ) : (
                  <img src={preview} alt="Material thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            )}
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 4px', fontFamily: 'var(--font-serif)' }}>
              Recognizing material
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              AI is identifying the product and its specifications.
            </p>
          </div>

          {/* MIDDLE: Stage badge, Progress bar, Metrics */}
          <div style={{ width: '100%', maxWidth: '360px', margin: '20px 0' }}>
            {/* Current stage badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-logo-bg)',
                  color: '#202020',
                  border: '1.5px solid var(--color-border)',
                }}
              >
                {getStageBadgeLabel(processingStage)}
              </span>
            </div>

            {/* Stable Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '10px',
                background: '#E2E8F0',
                borderRadius: 'var(--radius-pill)',
                overflow: 'hidden',
                border: '1.5px solid var(--color-border)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(5, processingProgress))}%`,
                  height: '100%',
                  background: processingProgress === 100 ? 'var(--color-success)' : 'var(--color-primary)',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>

            {/* Percentage & Elapsed time row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                fontWeight: 600,
              }}
            >
              <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{processingProgress}%</span>
              <span>{formatElapsed(processingElapsedSeconds)}</span>
            </div>
          </div>

          {/* BOTTOM: Status message container (fixed height to prevent layout jumps) & Cancel */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                minHeight: '48px',
                width: '100%',
                maxWidth: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 8px',
                boxSizing: 'border-box',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  lineHeight: 1.4,
                  color: isRetryMessage(processingStatusMessage) ? '#B45309' : 'var(--text-secondary)',
                  fontWeight: isRetryMessage(processingStatusMessage) ? 700 : 500,
                  margin: 0,
                  overflowWrap: 'break-word',
                }}
              >
                {processingStatusMessage || 'Identifying material and specifications...'}
              </p>
            </div>

            {onCancelProcessing && (
              <button
                type="button"
                onClick={onCancelProcessing}
                className="btn btn-outline btn-sm"
                style={{
                  marginTop: '12px',
                  height: '32px',
                  fontSize: '12px',
                  borderColor: 'var(--color-border)',
                }}
              >
                Cancel extraction
              </button>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. RECOGNITION FAILURE ERROR PANEL (When error & !processing)  */}
      {/* ------------------------------------------------------------- */}
      {recognitionError && !isProcessing && (
        <div
          data-testid="recognition-error-panel"
          style={{
            width: '100%',
            maxWidth: '520px',
            margin: '0 auto 16px',
            padding: '24px 20px',
            background: 'var(--bg-surface)',
            border: '2.5px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-hard)',
            boxSizing: 'border-box',
          }}
        >
          {/* Header & thumbnail */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            {preview && (
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: '2px solid var(--color-border)',
                  background: 'var(--bg-surface-subtle)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {preview.startsWith('data:application/pdf') ? (
                  <FileText size={26} strokeWidth={2.5} color="var(--color-primary)" />
                ) : (
                  <img src={preview} alt="Material thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <AlertCircle size={18} color="#DC2626" strokeWidth={2.5} />
                <h4 style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-serif)' }}>
                  Material recognition could not be completed
                </h4>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Your photo is preserved. You can retry recognition or enter details manually.
              </p>
            </div>
          </div>

          {/* Sanitized error explanation note */}
          <div
            style={{
              background: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              marginBottom: '18px',
              fontSize: '12px',
              color: '#991B1B',
              lineHeight: 1.4,
            }}
          >
            <strong>Status:</strong> {recognitionError}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  onClearError?.();
                  if (preview) onPhotoProcessed(preview);
                }}
                className="btn btn-primary"
                style={{ flex: 1, minWidth: '160px', height: '40px' }}
              >
                <RefreshCw size={15} />
                <span>Retry recognition</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (preview && onManualEntryWithPhoto) {
                    onManualEntryWithPhoto(preview);
                  }
                }}
                className="btn btn-secondary"
                style={{ flex: 1, minWidth: '160px', height: '40px' }}
              >
                <FileText size={15} />
                <span>Enter details manually</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                onClearError?.();
                setPreview(null);
                handleTakePhoto();
              }}
              className="btn btn-outline"
              style={{ width: '100%', height: '36px', fontSize: '13px' }}
            >
              <Camera size={14} />
              <span>Take another photo</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. CAPTURED / UPLOADED PREVIEW (When !isProcessing & !error)   */}
      {/* ------------------------------------------------------------- */}
      {preview && !isCapturing && !isProcessing && !recognitionError && (
        <div style={{
          position: 'relative',
          width: '100%',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: '16px',
          background: 'var(--bg-surface-subtle)',
          border: '2.5px solid var(--color-border)',
          boxShadow: 'var(--shadow-hard)',
        }}>
          {preview.startsWith('data:application/pdf') ? (
            <div style={{
              padding: '36px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-surface-subtle)',
              gap: '12px',
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-logo-bg)',
                border: '2px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-hard-xs)',
              }}>
                <FileText size={30} strokeWidth={2.5} color="#202020" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
                  PDF Invoice Attached
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Ready for AI material and line-item extraction
                </p>
              </div>
            </div>
          ) : (
            <img
              src={preview}
              alt="Material preview"
              style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block', background: 'var(--bg-surface-subtle)' }}
            />
          )}

          {/* Preview Action Buttons */}
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            borderTop: '2.5px solid var(--color-border)',
            flexWrap: 'wrap',
          }}>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                handleTakePhoto();
              }}
              className="btn btn-secondary"
              style={{ flex: 1, minWidth: '120px' }}
            >
              <Camera size={15} />
              <span>Retake</span>
            </button>

            <button
              type="button"
              onClick={() => onPhotoProcessed(preview)}
              className="btn btn-primary"
              style={{ flex: 1, minWidth: '150px' }}
            >
              <Sparkles size={15} />
              <span>Extract details</span>
            </button>
          </div>
        </div>
      )}

      {/* Initial Action Buttons when camera is inactive and no preview */}
      {!isCapturing && !preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Detailed recovery messages for camera issues */}
          {cameraError === 'PERMISSION_DENIED' && (
            <div style={{
              background: 'var(--color-error)',
              border: '2px solid var(--color-border)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              color: '#202020',
              fontSize: '13px',
              boxShadow: 'var(--shadow-hard-xs)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                <AlertCircle size={18} color="#202020" />
                <span>Camera Access Blocked in Browser</span>
              </div>
              <p style={{ margin: '0 0 10px', color: '#202020', lineHeight: 1.5 }}>
                Your browser blocked camera permissions for this site.
                <br />
                <strong>To fix on Laptop / Desktop:</strong>
                <br />
                1. Click the <strong>lock 🔒 or tune icon</strong> on the left side of your address bar (next to the website URL).
                <br />
                2. Switch <strong>Camera</strong> permission to <strong>Allow</strong>.
                <br />
                3. Click <strong>Retry Camera</strong> below.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn btn-primary btn-sm"
                  style={{ height: '34px' }}
                >
                  <RefreshCw size={14} /> Retry Camera
                </button>
                <button
                  type="button"
                  onClick={triggerNativeCamera}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '34px' }}
                >
                  <Camera size={14} /> Use Device Camera / File
                </button>
              </div>
            </div>
          )}

          {cameraError === 'DEVICE_BUSY' && (
            <div style={{
              background: 'var(--color-warning)',
              border: '2px solid var(--color-border)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              color: '#202020',
              fontSize: '13px',
              boxShadow: 'var(--shadow-hard-xs)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                <AlertCircle size={18} color="#202020" />
                <span>Camera Is In Use</span>
              </div>
              <p style={{ margin: '0 0 10px', lineHeight: 1.5, color: '#202020' }}>
                Another application (such as Zoom, Microsoft Teams, or Skype) is currently using your webcam. Please close it and retry.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={startCamera}
                  className="btn btn-primary btn-sm"
                  style={{ height: '34px' }}
                >
                  <RefreshCw size={14} /> Retry Camera
                </button>
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '34px' }}
                >
                  <FileUp size={14} /> Upload photo Instead
                </button>
              </div>
            </div>
          )}

          {cameraError === 'NO_DEVICE' && (
            <div style={{
              background: 'var(--color-error)',
              border: '2px solid var(--color-border)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              color: '#202020',
              fontSize: '13px',
              boxShadow: 'var(--shadow-hard-xs)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>
                <AlertCircle size={18} color="#202020" />
                <span>No Camera Found</span>
              </div>
              <p style={{ margin: '0 0 10px', lineHeight: 1.5, color: '#202020' }}>
                No camera device was detected on your computer. You can upload an invoice image or bill file directly.
              </p>
              <button
                type="button"
                onClick={triggerFileUpload}
                className="btn btn-primary btn-sm"
                style={{ height: '34px' }}
              >
                <Upload size={14} /> Upload photo File
              </button>
            </div>
          )}

          {cameraError &&
            cameraError !== 'PERMISSION_DENIED' &&
            cameraError !== 'DEVICE_BUSY' &&
            cameraError !== 'NO_DEVICE' && (
              <div style={{
                background: 'var(--color-error)',
                border: '2px solid var(--color-border)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                color: '#202020',
                fontSize: '12px',
                boxShadow: 'var(--shadow-hard-xs)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <AlertCircle size={16} />
                  <span style={{ fontWeight: 600 }}>{cameraError}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={triggerNativeCamera}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '30px' }}
                  >
                    <Camera size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Take Photo (Native)
                  </button>
                  <button
                    type="button"
                    onClick={triggerFileUpload}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '30px' }}
                  >
                    <Upload size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Upload File
                  </button>
                </div>
              </div>
            )}

          {/* Upload Error Display */}
          {uploadError && (
            <div style={{
              background: 'var(--color-error)',
              border: '2px solid var(--color-border)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              color: '#202020',
              fontSize: '13px',
              boxShadow: 'var(--shadow-hard-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <AlertCircle size={18} color="#202020" style={{ flexShrink: 0 }} />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="btn-icon"
                style={{ width: '28px', height: '28px', flexShrink: 0 }}
                title="Dismiss"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Main Action Buttons: Two clearly differentiated actions */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}>
            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={isProcessing}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '13px',
                padding: '0 8px',
                minWidth: 0,
              }}
              aria-label="Take photo"
            >
              <Camera size={16} />
              <span>Take photo</span>
            </button>

            <button
              type="button"
              onClick={triggerFileUpload}
              disabled={isProcessing}
              className="btn btn-secondary"
              style={{
                width: '100%',
                height: '42px',
                fontSize: '13px',
                padding: '0 8px',
                minWidth: 0,
              }}
              aria-label="Upload photo"
            >
              <Upload size={16} />
              <span>Upload photo</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
