import React, { useState } from 'react';
import { Camera, Upload, RotateCw, X, Sparkles, AlertCircle, RefreshCw, FileUp, FileText } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';

interface PhotoCaptureProps {
  onPhotoProcessed: (imageBase64: string) => Promise<void>;
  isProcessing: boolean;
  processingProgress: number;
  processingStage?: 'idle' | 'preparing' | 'sending' | 'extracting' | 'processing' | 'complete' | 'error';
  processingStatusMessage?: string;
  processingElapsedSeconds?: number;
  onCancelProcessing?: () => void;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  onPhotoProcessed,
  isProcessing,
  processingProgress,
  processingStage,
  processingStatusMessage,
  processingElapsedSeconds,
  onCancelProcessing,
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

      {/* Captured / Uploaded Image Preview */}
      {preview && !isCapturing && (
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
              alt="Invoice preview"
              style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', display: 'block', background: 'var(--bg-surface-subtle)' }}
            />
          )}

          {/* Processing Overlay with Progress bar */}
          {isProcessing && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(32, 32, 32, 0.94)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              padding: '24px',
              textAlign: 'center',
              zIndex: 15,
            }}>
              <div className="animate-spin" style={{ fontSize: '28px', marginBottom: '12px', color: 'var(--color-yellow)' }}>
                ⟳
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginBottom: '4px', fontFamily: 'var(--font-serif)' }}>
                {processingStage === 'preparing'
                  ? 'Preparing document...'
                  : processingStage === 'sending'
                  ? 'Connecting to AI engine...'
                  : processingStage === 'extracting'
                  ? `AI model extracting details (${processingElapsedSeconds || 0}s)...`
                  : processingStage === 'processing'
                  ? 'Validating extracted numbers...'
                  : processingStage === 'complete'
                  ? 'Extraction complete!'
                  : 'Extracting material details...'}
              </h3>
              <p style={{ fontSize: '13px', color: '#F4EBDD', marginBottom: '14px', maxWidth: '300px' }}>
                {processingStatusMessage || 'Analyzing item name, vendor, tax rate, quantity, and price.'}
              </p>

              {/* Progress bar with active animation */}
              <div style={{
                width: '100%',
                maxWidth: '260px',
                height: '10px',
                background: '#FFFFFF',
                borderRadius: 'var(--radius-pill)',
                overflow: 'hidden',
                border: '1.5px solid var(--color-border)',
                position: 'relative',
              }}>
                <div
                  className={processingStage === 'extracting' ? 'progress-pulse' : ''}
                  style={{
                    width: `${Math.min(100, Math.max(5, processingProgress))}%`,
                    height: '100%',
                    background: processingStage === 'complete' ? 'var(--color-success)' : 'var(--color-teal)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', color: '#F4EBDD', fontWeight: 700 }}>
                  {processingProgress}%
                </span>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>•</span>
                <span style={{ fontSize: '12px', color: '#F4EBDD' }}>
                  {processingElapsedSeconds || 0}s elapsed
                </span>
              </div>

              {/* Long-running message when elapsed >= 15s */}
              {(processingElapsedSeconds || 0) >= 15 && (
                <p style={{ fontSize: '11px', color: '#FDE047', marginTop: '10px', maxWidth: '280px' }}>
                  Detailed documents with multiple line items require extra analysis. Still working...
                </p>
              )}

              {/* Cancel button */}
              {onCancelProcessing && (
                <button
                  type="button"
                  onClick={onCancelProcessing}
                  className="btn btn-outline btn-sm"
                  style={{
                    marginTop: '14px',
                    height: '28px',
                    padding: '0 12px',
                    fontSize: '11px',
                    color: '#FFFFFF',
                    borderColor: 'rgba(255,255,255,0.4)',
                    background: 'transparent',
                  }}
                >
                  Cancel extraction
                </button>
              )}
            </div>
          )}

          {/* Preview Action Buttons */}
          {!isProcessing && (
            <div style={{
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderTop: '2.5px solid var(--color-border)',
            }}>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  handleTakePhoto();
                }}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                <Camera size={15} />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={() => onPhotoProcessed(preview)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Sparkles size={15} />
                <span>Extract details</span>
              </button>
            </div>
          )}
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
                  <FileUp size={14} /> Upload Invoice Instead
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
                <Upload size={14} /> Upload Invoice File
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
              aria-label="Upload invoice"
            >
              <Upload size={16} />
              <span>Upload invoice</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
