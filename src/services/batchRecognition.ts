// src/services/batchRecognition.ts
import { MaterialRecognitionResult } from '@/types';
import { resilientGateway } from './resilientGateway';

export interface BatchItem {
  id: string;
  name: string;
  imageBase64: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: MaterialRecognitionResult;
  error?: string;
  onSuccess?: (result: MaterialRecognitionResult) => void;
  onError?: (error: Error) => void;
}

export class BatchRecognitionQueue {
  private queue: BatchItem[] = [];
  private activeCount = 0;
  private readonly concurrency: number;
  private listeners: Array<() => void> = [];

  constructor(concurrency: number = 2) {
    this.concurrency = concurrency;
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getItems(): BatchItem[] {
    return [...this.queue];
  }

  public async addToBatch(item: Omit<BatchItem, 'status' | 'progress'>): Promise<void> {
    const fullItem: BatchItem = {
      ...item,
      status: 'pending',
      progress: 0,
    };
    this.queue.push(fullItem);
    this.notify();
    this.processNext();
  }

  public async addMultiple(items: Array<Omit<BatchItem, 'status' | 'progress'>>): Promise<void> {
    items.forEach((item) => {
      this.queue.push({
        ...item,
        status: 'pending',
        progress: 0,
      });
    });
    this.notify();
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.concurrency) return;

    const nextItem = this.queue.find((i) => i.status === 'pending');
    if (!nextItem) return;

    this.activeCount++;
    nextItem.status = 'processing';
    this.notify();

    try {
      const result = await resilientGateway.recognizeWithRetry(
        nextItem.imageBase64,
        {},
        (p) => {
          nextItem.progress = p;
          this.notify();
        }
      );
      nextItem.status = 'completed';
      nextItem.progress = 100;
      nextItem.result = result;
      nextItem.onSuccess?.(result);
    } catch (err) {
      nextItem.status = 'error';
      nextItem.error = err instanceof Error ? err.message : String(err);
      nextItem.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.activeCount--;
      this.notify();
      this.processNext();
    }
  }

  public clearCompleted(): void {
    this.queue = this.queue.filter((i) => i.status === 'processing' || i.status === 'pending');
    this.notify();
  }

  public getSize(): number {
    return this.queue.length;
  }
}

export const batchQueue = new BatchRecognitionQueue(2);
