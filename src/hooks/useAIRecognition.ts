// src/hooks/useAIRecognition.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { MaterialRecognitionResult, ConfidenceLevel } from '@/types';
import { resilientGateway } from '@/services/resilientGateway';
import { recognitionCache } from '@/services/cacheManager';
import { telemetry } from '@/services/telemetry';

export type RecognitionStage =
  | 'idle'
  | 'preparing'
  | 'sending'
  | 'extracting'
  | 'processing'
  | 'complete'
  | 'error';

export const scoreToConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= 0.9) return 'high';
  if (score >= 0.7) return 'medium';
  if (score >= 0.5) return 'low';
  return 'unknown';
};

export const useAIRecognition = () => {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<RecognitionStage>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastResult, setLastResult] = useState<MaterialRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const requestIdRef = useRef(0);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const cancelRecognition = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecognizing(false);
    setProgress(0);
    setStage('idle');
    setStatusMessage('');
    setElapsedSeconds(0);
    setError(null);
  }, []);

  const recognize = useCallback(
    async (imageBase64: string): Promise<MaterialRecognitionResult> => {
      // Prevent duplicate recognition requests caused by rapid repeated taps
      if (isRecognizing && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      requestIdRef.current += 1;
      const currentRequestId = requestIdRef.current;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsRecognizing(true);
      setError(null);
      setProgress(10);
      setStage('preparing');
      setStatusMessage('Validating and preparing document...');
      setElapsedSeconds(0);

      // Start elapsed timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const timerStart = Date.now();
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - timerStart) / 1000));
      }, 500);

      const startTime = performance.now();

      try {
        const cachePrompt = 'extract-material-v1';
        // 1. Check cache first
        const cached = recognitionCache.get(imageBase64, cachePrompt);
        if (cached) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setProgress(100);
          setStage('complete');
          setStatusMessage('Loaded from instant cache');
          setLastResult(cached);
          setIsRecognizing(false);
          return cached;
        }

        // 2. Call resilient gateway with streaming progress & AbortSignal
        const result = await resilientGateway.recognizeWithRetry(
          imageBase64,
          {},
          (p, stg, msg) => {
            if (requestIdRef.current !== currentRequestId) return; // Stale check
            setProgress(p);
            if (stg) setStage(stg as RecognitionStage);
            if (msg) setStatusMessage(msg);
          },
          abortController.signal
        );

        if (requestIdRef.current !== currentRequestId) {
          throw new Error('Recognition superseded by a newer request.');
        }

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setProgress(100);
        setStage('complete');
        setStatusMessage('Extraction verified! Opening review form...');
        setLastResult(result);

        // 3. Save to cache
        recognitionCache.set(imageBase64, cachePrompt, result);

        // 4. Log telemetry
        const duration = Math.round(performance.now() - startTime);
        telemetry.logRecognition({
          imageSize: imageBase64.length,
          processingTime: duration,
          confidence: {
            item: result.item.confidence,
            vendor: result.vendor.confidence,
            price: result.price.confidence,
            gst: result.gst.confidence,
          },
          fieldsEdited: [],
          success: true,
        });

        return result;
      } catch (err: any) {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        // Ignore aborts
        if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('cancelled')) {
          setStage('idle');
          setIsRecognizing(false);
          throw err;
        }

        const msg = err.message || 'Material recognition failed';
        setError(msg);
        setStage('error');
        setStatusMessage(msg);

        telemetry.logRecognition({
          imageSize: imageBase64.length,
          processingTime: Math.round(performance.now() - startTime),
          confidence: { item: 0, vendor: 0, price: 0, gst: 0 },
          fieldsEdited: [],
          success: false,
          error: msg,
        });
        throw err;
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsRecognizing(false);
        }
      }
    },
    [isRecognizing]
  );

  return {
    recognize,
    isRecognizing,
    progress,
    stage,
    statusMessage,
    elapsedSeconds,
    cancelRecognition,
    lastResult,
    error,
    clearResult: () => setLastResult(null),
  };
};
