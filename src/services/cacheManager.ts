// src/services/cacheManager.ts
import { MaterialRecognitionResult } from '@/types';

interface CacheEntry {
  result: MaterialRecognitionResult;
  timestamp: number;
  ttl: number; // milliseconds
}

class RecognitionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'pw_materials_recognition_cache';

  constructor() {
    this.loadFromStorage();
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return 'cache_' + Math.abs(hash).toString(16);
  }

  public generateKey(imageBase64: string, prompt: string): string {
    // Generate deterministic key based on first & last portions of base64 plus length
    const sample = imageBase64.slice(0, 100) + imageBase64.slice(-100) + imageBase64.length;
    return this.simpleHash(sample + prompt);
  }

  public get(imageBase64: string, prompt: string): MaterialRecognitionResult | null {
    const key = this.generateKey(imageBase64, prompt);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return entry.result;
  }

  public set(
    imageBase64: string,
    prompt: string,
    result: MaterialRecognitionResult,
    ttl = this.DEFAULT_TTL
  ): void {
    const key = this.generateKey(imageBase64, prompt);
    this.cache.set(key, { result, timestamp: Date.now(), ttl });
    this.saveToStorage();
  }

  public clear(): void {
    this.cache.clear();
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignore
    }
  }

  private saveToStorage(): void {
    try {
      const obj: Record<string, CacheEntry> = {};
      this.cache.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage quota or unavailable
    }
  }

  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        for (const [key, value] of Object.entries(parsed)) {
          const entry = value as CacheEntry;
          if (now - entry.timestamp <= entry.ttl) {
            this.cache.set(key, entry);
          }
        }
      }
    } catch {
      // Ignore
    }
  }
}

export const recognitionCache = new RecognitionCache();
