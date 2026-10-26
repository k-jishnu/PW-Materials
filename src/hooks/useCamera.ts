// src/hooks/useCamera.ts
import { useState, useRef, useCallback, useEffect } from 'react';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  }, []);

  const triggerNativeCamera = useCallback(() => {
    setCameraError(null);
    nativeCameraInputRef.current?.click();
  }, []);

  const triggerFileUpload = useCallback(() => {
    setCameraError(null);
    fileInputRef.current?.click();
  }, []);

  const clearCameraError = useCallback(() => {
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    // Check if getUserMedia is available in this browser/context
    // On mobile over insecure HTTP (e.g., http://192.168.x.x:3000), mediaDevices is disabled by browser security
    const hasMediaDevices =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    if (!hasMediaDevices) {
      // Seamlessly trigger native camera on mobile/insecure context
      if (nativeCameraInputRef.current) {
        nativeCameraInputRef.current.click();
        return;
      }
      setCameraError('Camera API requires HTTPS or a secure browser context. Please use File Upload.');
      return;
    }

    try {
      // Stop previous stream if running
      stopCamera();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (constraintErr: any) {
        // Fallback to basic video constraint if ideal facingMode or resolution is rejected by laptop webcam
        console.warn('Ideal constraints failed, attempting basic video constraint:', constraintErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCapturing(true);
        setHasPermission(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setHasPermission(false);
      setIsCapturing(false);

      const errName = err?.name || '';
      const errMsg = err?.message || '';

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission denied')
      ) {
        setCameraError('PERMISSION_DENIED');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('NO_DEVICE');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraError('DEVICE_BUSY');
      } else {
        setCameraError(errMsg || 'Camera permission denied or camera not available');
      }
    }
  }, [facingMode, stopCamera]);

  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  // Re-start camera when facing mode changes if already capturing
  useEffect(() => {
    if (isCapturing) {
      startCamera();
    }
  }, [facingMode]);

  // Clean up tracks on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const capturePhoto = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current) {
        reject(new Error('Video or canvas ref not ready'));
        return;
      }

      // Trigger 100ms flash overlay
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 200);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);

      stopCamera();
      resolve(base64);
    });
  }, [stopCamera]);

  const handleFileChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      onFileReady: (base64: string) => void,
      onError?: (err: string) => void
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 1. Validate file size (10MB limit)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        e.target.value = '';
        const msg = `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit. Please upload a smaller file.`;
        if (onError) onError(msg);
        else setCameraError(msg);
        return;
      }

      // 2. Validate file type (JPEG, PNG, WebP, GIF, or PDF)
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const isPdfExt = fileExt === 'pdf';
      const isImgExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt || '');

      if (!validTypes.includes(file.type) && !isPdfExt && !isImgExt) {
        e.target.value = '';
        const msg = `Unsupported file type (${file.type || fileExt || 'unknown'}). Supported formats: JPEG, PNG, WebP, and PDF invoices.`;
        if (onError) onError(msg);
        else setCameraError(msg);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!result) return;

        // For PDF, pass data URL directly without image optimization
        if (file.type === 'application/pdf' || isPdfExt) {
          onFileReady(result);
          return;
        }

        // Auto-optimize large images > 1920px so mobile uploads don't freeze the browser
        const img = new Image();
        img.onload = () => {
          const maxDim = 1920;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              onFileReady(canvas.toDataURL('image/jpeg', 0.85));
              return;
            }
          }
          onFileReady(result);
        };
        img.onerror = () => {
          onFileReady(result);
        };
        img.src = result;
      };
      reader.onerror = () => {
        const msg = 'Failed to read the selected file. Please try another file.';
        if (onError) onError(msg);
        else setCameraError(msg);
      };
      reader.readAsDataURL(file);
      // Reset input value so same file can be selected again
      e.target.value = '';
    },
    []
  );

  return {
    videoRef,
    canvasRef,
    fileInputRef,
    nativeCameraInputRef,
    isCapturing,
    facingMode,
    hasPermission,
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
  };
};
