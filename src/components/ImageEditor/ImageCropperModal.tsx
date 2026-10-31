// src/components/ImageEditor/ImageCropperModal.tsx
//
// Interactive touch & mouse enabled Image Cropper and Editor modal:
// - Freeform / bounded cropping box with drag & resize handles
// - 90-degree clockwise and counter-clockwise rotation
// - Zoom in / Zoom out slider & buttons
// - Reset adjustments
// - High quality base64 output for AI Recognition
//

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
  Crop,
  RefreshCw,
} from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageBase64: string;
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
}

interface CropBox {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

const DEFAULT_CROP_BOX: CropBox = {
  x: 5,
  y: 5,
  width: 90,
  height: 90,
};

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageBase64,
  onConfirm,
  onCancel,
}) => {
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [zoom, setZoom] = useState<number>(1); // 1.0 to 3.0
  const [cropBox, setCropBox] = useState<CropBox>(DEFAULT_CROP_BOX);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    isDragging: boolean;
    dragType: 'move' | 'nw' | 'ne' | 'se' | 'sw' | null;
    startX: number;
    startY: number;
    startBox: CropBox;
  }>({
    isDragging: false,
    dragType: null,
    startX: 0,
    startY: 0,
    startBox: DEFAULT_CROP_BOX,
  });

  // Reset state when a new image is loaded
  useEffect(() => {
    if (isOpen) {
      setRotation(0);
      setZoom(1);
      setCropBox(DEFAULT_CROP_BOX);
      setIsProcessing(false);
    }
  }, [isOpen, imageBase64]);

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, +(prev + 0.2).toFixed(1)));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(1, +(prev - 0.2).toFixed(1)));
  };

  const handleReset = () => {
    setRotation(0);
    setZoom(1);
    setCropBox(DEFAULT_CROP_BOX);
  };

  // Dragging logic for crop box and resize handles
  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'move' | 'nw' | 'ne' | 'se' | 'sw'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      isDragging: true,
      dragType: type,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const { startBox, dragType } = dragRef.current;

    setCropBox(() => {
      let next = { ...startBox };

      if (dragType === 'move') {
        next.x = Math.max(0, Math.min(100 - startBox.width, startBox.x + deltaXPercent));
        next.y = Math.max(0, Math.min(100 - startBox.height, startBox.y + deltaYPercent));
      } else if (dragType === 'se') {
        next.width = Math.max(15, Math.min(100 - startBox.x, startBox.width + deltaXPercent));
        next.height = Math.max(15, Math.min(100 - startBox.y, startBox.height + deltaYPercent));
      } else if (dragType === 'sw') {
        const potentialX = Math.max(0, Math.min(startBox.x + startBox.width - 15, startBox.x + deltaXPercent));
        next.width = startBox.x + startBox.width - potentialX;
        next.x = potentialX;
        next.height = Math.max(15, Math.min(100 - startBox.y, startBox.height + deltaYPercent));
      } else if (dragType === 'ne') {
        const potentialY = Math.max(0, Math.min(startBox.y + startBox.height - 15, startBox.y + deltaYPercent));
        next.height = startBox.y + startBox.height - potentialY;
        next.y = potentialY;
        next.width = Math.max(15, Math.min(100 - startBox.x, startBox.width + deltaXPercent));
      } else if (dragType === 'nw') {
        const potentialX = Math.max(0, Math.min(startBox.x + startBox.width - 15, startBox.x + deltaXPercent));
        const potentialY = Math.max(0, Math.min(startBox.y + startBox.height - 15, startBox.y + deltaYPercent));
        next.width = startBox.x + startBox.width - potentialX;
        next.x = potentialX;
        next.height = startBox.y + startBox.height - potentialY;
        next.y = potentialY;
      }

      return next;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture release throws
      }
    }
  };

  // Perform canvas crop, rotation, and export
  const handleApplyCrop = useCallback(async () => {
    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageBase64;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for cropping'));
      });

      // 1. Create a canvas for rotating and zooming the image
      const srcW = img.naturalWidth || img.width;
      const srcH = img.naturalHeight || img.height;

      // Swap dimensions if rotation is 90 or 270 degrees
      const isQuarterRotated = rotation === 90 || rotation === 270;
      const rotW = isQuarterRotated ? srcH : srcW;
      const rotH = isQuarterRotated ? srcW : srcH;

      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = rotW;
      rotCanvas.height = rotH;
      const rotCtx = rotCanvas.getContext('2d');
      if (!rotCtx) throw new Error('Could not get canvas context');

      rotCtx.translate(rotW / 2, rotH / 2);
      rotCtx.rotate((rotation * Math.PI) / 180);
      rotCtx.drawImage(img, -srcW / 2, -srcH / 2, srcW, srcH);

      // 2. Crop according to cropBox percentages relative to the transformed image
      // Note: cropBox values are in percentages (0-100)
      const cropX = Math.max(0, Math.floor((cropBox.x / 100) * rotW));
      const cropY = Math.max(0, Math.floor((cropBox.y / 100) * rotH));
      const cropW = Math.min(rotW - cropX, Math.ceil((cropBox.width / 100) * rotW));
      const cropH = Math.min(rotH - cropY, Math.ceil((cropBox.height / 100) * rotH));

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) throw new Error('Could not get crop canvas context');

      cropCtx.imageSmoothingEnabled = true;
      cropCtx.imageSmoothingQuality = 'high';
      cropCtx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const croppedResult = cropCanvas.toDataURL('image/jpeg', 0.92);
      onConfirm(croppedResult);
    } catch (err) {
      console.error('Error applying crop:', err);
      // Fallback: send original image if canvas manipulation fails
      onConfirm(imageBase64);
    } finally {
      setIsProcessing(false);
    }
  }, [imageBase64, rotation, cropBox, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(20, 24, 28, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 150,
        padding: '12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          boxShadow: 'var(--shadow-hard-lg)',
          overflow: 'hidden',
          border: '2.5px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '2.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crop size={20} strokeWidth={2.5} color="var(--text-primary)" />
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 900,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-serif)',
                margin: 0,
              }}
            >
              Adjust & Crop Material
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="btn-icon"
            style={{ width: '32px', height: '32px' }}
            aria-label="Close image editor"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body / Canvas Viewport */}
        <div
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            overflowY: 'auto',
            background: '#F4EAE0',
          }}
        >
          {/* Instructions banner */}
          <div
            style={{
              width: '100%',
              background: '#FFFFFF',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hard-xs)',
              padding: '8px 12px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            <span>Drag the bounding box or corners to focus on the label or invoice.</span>
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 4px',
              }}
            >
              <RefreshCw size={12} strokeWidth={2.5} /> Reset
            </button>
          </div>

          {/* Interactive Crop Frame */}
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '520px',
              height: '340px',
              background: '#1F2421',
              borderRadius: 'var(--radius-md)',
              border: '2.5px solid var(--color-border)',
              boxShadow: 'var(--shadow-hard-sm)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'none',
              userSelect: 'none',
            }}
          >
            {/* The Image being cropped */}
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transition: 'transform 0.18s ease-out',
                pointerEvents: 'none',
              }}
            >
              <img
                ref={imageRef}
                src={imageBase64}
                alt="Captured material preview"
                style={{
                  maxWidth: '92%',
                  maxHeight: '92%',
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Dark Mask Overlay Outside Crop Box */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.55)`,
                pointerEvents: 'none',
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
              }}
            />

            {/* Draggable Crop Rectangle */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              style={{
                position: 'absolute',
                left: `${cropBox.x}%`,
                top: `${cropBox.y}%`,
                width: `${cropBox.width}%`,
                height: `${cropBox.height}%`,
                border: '2.5px solid #FFE9A3',
                boxShadow: '0 0 0 1px #202020, inset 0 0 0 1px #202020',
                cursor: 'grab',
                boxSizing: 'border-box',
                touchAction: 'none',
              }}
            >
              {/* Grid lines inside crop box */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gridTemplateRows: '1fr 1fr 1fr',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.4)', borderBottom: '1px dashed rgba(255, 255, 255, 0.4)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.4)', borderBottom: '1px dashed rgba(255, 255, 255, 0.4)' }} />
                <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.4)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.4)', borderBottom: '1px dashed rgba(255, 255, 255, 0.4)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.4)', borderBottom: '1px dashed rgba(255, 255, 255, 0.4)' }} />
                <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.4)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.4)' }} />
                <div style={{ borderRight: '1px dashed rgba(255, 255, 255, 0.4)' }} />
                <div />
              </div>

              {/* 4 Corner Resize Handles */}
              {/* Top-Left */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
                style={{
                  position: 'absolute',
                  top: '-7px',
                  left: '-7px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#FFE9A3',
                  border: '2px solid #202020',
                  borderRadius: '3px',
                  cursor: 'nwse-resize',
                  touchAction: 'none',
                }}
              />
              {/* Top-Right */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'ne')}
                style={{
                  position: 'absolute',
                  top: '-7px',
                  right: '-7px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#FFE9A3',
                  border: '2px solid #202020',
                  borderRadius: '3px',
                  cursor: 'nesw-resize',
                  touchAction: 'none',
                }}
              />
              {/* Bottom-Right */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'se')}
                style={{
                  position: 'absolute',
                  bottom: '-7px',
                  right: '-7px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#FFE9A3',
                  border: '2px solid #202020',
                  borderRadius: '3px',
                  cursor: 'nwse-resize',
                  touchAction: 'none',
                }}
              />
              {/* Bottom-Left */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'sw')}
                style={{
                  position: 'absolute',
                  bottom: '-7px',
                  left: '-7px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#FFE9A3',
                  border: '2px solid #202020',
                  borderRadius: '3px',
                  cursor: 'nesw-resize',
                  touchAction: 'none',
                }}
              />
            </div>
          </div>

          {/* Action Toolbar: Rotate & Zoom Controls */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              padding: '6px 0',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
                boxShadow: 'var(--shadow-hard-xs)',
              }}
            >
              <button
                type="button"
                onClick={handleRotateLeft}
                className="btn-icon"
                title="Rotate 90° CCW"
                style={{ width: '34px', height: '34px', background: 'var(--bg-card)' }}
              >
                <RotateCcw size={16} strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '42px', textAlign: 'center' }}>
                {rotation}°
              </span>
              <button
                type="button"
                onClick={handleRotateRight}
                className="btn-icon"
                title="Rotate 90° CW"
                style={{ width: '34px', height: '34px', background: 'var(--bg-card)' }}
              >
                <RotateCw size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#FFFFFF',
                padding: '4px 8px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
                boxShadow: 'var(--shadow-hard-xs)',
              }}
            >
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="btn-icon"
                title="Zoom Out"
                style={{ width: '34px', height: '34px', background: 'var(--bg-card)', opacity: zoom <= 1 ? 0.5 : 1 }}
              >
                <ZoomOut size={16} strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '42px', textAlign: 'center' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="btn-icon"
                title="Zoom In"
                style={{ width: '34px', height: '34px', background: 'var(--bg-card)', opacity: zoom >= 3 ? 0.5 : 1 }}
              >
                <ZoomIn size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 18px',
            borderTop: '2.5px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            style={{ minWidth: '95px', height: '40px', fontSize: '13px' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="btn btn-primary"
            style={{
              minWidth: '160px',
              height: '40px',
              fontSize: '13px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={15} className="spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Check size={16} strokeWidth={2.8} />
                <span>Use This Image</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

