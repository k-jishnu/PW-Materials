// src/services/resilientGateway.ts
import { MaterialRecognitionResult } from '@/types';
import { gatewayAPI } from './gatewayAPI';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class ResilientGatewayAPI {
  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async recognizeWithRetry(
    imageBase64: string,
    config: Partial<RetryConfig> = {},
    onProgress?: (progress: number) => void
  ): Promise<MaterialRecognitionResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[ResilientGateway] Retry attempt ${attempt + 1}/${finalConfig.maxRetries + 1}`);
        }
        const result = await gatewayAPI.recognizeMaterial(imageBase64, onProgress);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`[ResilientGateway] Attempt ${attempt + 1} failed:`, lastError.message);

        // Do not retry client auth/validation errors (401, 403, 400)
        if (
          lastError.message.includes('401') ||
          lastError.message.includes('403') ||
          lastError.message.includes('400')
        ) {
          throw lastError;
        }

        if (attempt < finalConfig.maxRetries) {
          const delayTime = Math.min(
            finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
            finalConfig.maxDelay
          );
          await this.delay(delayTime);
        }
      }
    }

    throw new Error(
      `Failed to recognize material after ${finalConfig.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }
}

export const resilientGateway = new ResilientGatewayAPI();
