// src/services/telemetry.ts
import { RecognitionMetrics } from '@/types';
import { gatewayAPI } from './gatewayAPI';

export class RecognitionTelemetry {
  private logs: Array<RecognitionMetrics & { timestamp: string }> = [];
  private readonly STORAGE_KEY = 'pw_materials_telemetry_logs';

  constructor() {
    this.loadLogs();
  }

  public async logRecognition(metrics: RecognitionMetrics): Promise<void> {
    const entry = {
      ...metrics,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop(); // Keep last 50
    this.saveLogs();

    // If custom API endpoint is active
    try {
      if (gatewayAPI.getConfig().useLiveClaudeGateway) {
        await fetch('/api/telemetry/recognition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).catch(() => {});
      }
    } catch {
      // Local fallback
    }
  }

  public async logGatewayHealth(): Promise<boolean> {
    const isHealthy = await gatewayAPI.healthCheck();
    try {
      if (gatewayAPI.getConfig().useLiveClaudeGateway) {
        await fetch('/api/telemetry/gateway-health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            healthy: isHealthy,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    } catch {
      // Local fallback
    }
    return isHealthy;
  }

  public getRecentLogs() {
    return [...this.logs];
  }

  private saveLogs(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
    } catch {
      // Storage full or unavailable
    }
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      // Ignore
    }
  }
}

export const telemetry = new RecognitionTelemetry();
