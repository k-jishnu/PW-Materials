// src/hooks/useAIRecognition.ts
import { useState, useCallback } from 'react';
import { MaterialRecognitionResult, ConfidenceLevel } from '@/types';
import { resilientGateway } from '@/services/resilientGateway';
import { recognitionCache } from '@/services/cacheManager';
import { telemetry } from '@/services/telemetry';

export const scoreToConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= 0.9) return 'high';
  if (score >= 0.7) return 'medium';
  if (score >= 0.5) return 'low';
  return 'unknown';
};

export const useAIRecognition = () => {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<MaterialRecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognize = useCallback(
    async (imageBase64: string): Promise<MaterialRecognitionResult> => {
      setIsRecognizing(true);
      setError(null);
      setProgress(10);
      const startTime = performance.now();

      try {
        const cachePrompt = 'extract-material-v1';
        // 1. Check cache first as per spec
        const cached = recognitionCache.get(imageBase64, cachePrompt);
        if (cached) {
          setProgress(100);
          setLastResult(cached);
          setIsRecognizing(false);
          return cached;
        }

        // 2. Call resilient gateway with retry & streaming progress
        const result = await resilientGateway.recognizeWithRetry(
          imageBase64,
          {},
          (p) => setProgress(p)
        );

        setProgress(100);
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
        const msg = err.message || 'Material recognition failed';
        setError(msg);
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
        setIsRecognizing(false);
      }
    },
    []
  );

  return {
    recognize,
    isRecognizing,
    progress,
    lastResult,
    error,
    clearResult: () => setLastResult(null),
  };
};
