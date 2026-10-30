// src/services/resilientGateway.ts
import type { MaterialRecognitionResult } from '@/types';
import { gatewayAPI, GatewayError } from './gatewayAPI';

export interface RetryProgressCallback {
  (progress: number, stage?: string, message?: string, isRetry?: boolean): void;
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class ResilientGatewayAPI {
  private defaultConfig: RetryConfig = {
    maxRetries: 2, // 2 retries = 3 attempts total (optimal balance, prevents retry storms)
    initialDelay: 1200,
    maxDelay: 5000,
    backoffMultiplier: 1.8,
  };

  private async delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error('Recognition was cancelled.'));
      }
      const timer = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);
      const onAbort = () => {
        cleanup();
        reject(new Error('Recognition was cancelled.'));
      };
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      };
      signal?.addEventListener('abort', onAbort);
    });
  }

  public async recognizeWithRetry(
    imageBase64: string,
    config: Partial<RetryConfig> = {},
    onProgress?: RetryProgressCallback,
    signal?: AbortSignal
  ): Promise<MaterialRecognitionResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;
    let highestProgress = 0;

    const monitoredProgress: RetryProgressCallback = (p, stg, msg, isRetry) => {
      highestProgress = Math.max(highestProgress, p);
      onProgress?.(highestProgress, stg, msg, isRetry);
    };

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      if (signal?.aborted) {
        throw new Error('Recognition was cancelled.');
      }

      try {
        if (attempt > 0) {
          console.log(`[ResilientGateway] Attempt ${attempt + 1}/${finalConfig.maxRetries + 1}...`);
          monitoredProgress(
            highestProgress,
            'connecting',
            `Temporary service interruption. Retrying securely (attempt ${attempt + 1} of ${finalConfig.maxRetries + 1})...`,
            true
          );
        }

        const result = await gatewayAPI.recognizeMaterial(
          imageBase64,
          (p, stg, msg) => monitoredProgress(p, stg, msg, false),
          signal,
          highestProgress
        );
        return result;
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (signal?.aborted || lastError.message.includes('cancelled') || lastError.message.includes('aborted')) {
          throw lastError;
        }

        // Check whether this error is permanently fatal and must NOT be retried
        const isGatewayError = error instanceof GatewayError;
        const status = isGatewayError ? error.status : 0;
        const isExplicitlyNonRetryable = isGatewayError && error.retryable === false;

        const isFatalStatus =
          status === 400 ||
          status === 401 ||
          status === 403 ||
          status === 413 ||
          status === 422;

        const isFatalMessage =
          lastError.message.includes('API_KEY') ||
          lastError.message.includes('Unsupported document format') ||
          lastError.message.includes('exceeds the 10MB limit') ||
          lastError.message.includes('Missing or empty') ||
          lastError.message.includes('authentication failed');

        if (isExplicitlyNonRetryable || isFatalStatus || isFatalMessage) {
          console.warn(`[ResilientGateway] Non-retryable error on attempt ${attempt + 1}:`, lastError.message);
          throw lastError;
        }

        // Check if we reached the maximum retry limit
        if (attempt >= finalConfig.maxRetries) {
          break;
        }

        // Compute exponential backoff with jitter
        let delayMs = Math.min(
          finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );
        // Add random jitter (0 to 400ms) to avoid retry collision spikes
        delayMs += Math.floor(Math.random() * 400);

        if (isGatewayError && error.retryAfter && error.retryAfter > 0) {
          delayMs = Math.min(error.retryAfter * 1000, 10000);
        }

        console.warn(
          `[ResilientGateway] Attempt ${attempt + 1} encountered temporary failure (${lastError.message}). Waiting ${delayMs}ms before retry...`
        );

        monitoredProgress(
          highestProgress,
          'connecting',
          `Temporary service interruption. Retrying in ${(delayMs / 1000).toFixed(1)}s (attempt ${attempt + 2} of ${finalConfig.maxRetries + 1})...`,
          true
        );

        await this.delay(delayMs, signal);
      }
    }

    throw new Error(
      lastError?.message || `Failed to recognize material after ${finalConfig.maxRetries + 1} attempts.`
    );
  }
}

export const resilientGateway = new ResilientGatewayAPI();
