// src/types/index.ts

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface ConfidenceField<T> {
  value: T;
  confidence: ConfidenceLevel;
  confidenceScore?: number; // 0.0 to 1.0
  source: 'ai' | 'manual';
}

export interface MaterialRecognitionResult {
  item: {
    name: string;
    confidence: number; // 0 to 1
  };
  vendor: {
    name: string;
    confidence: number;
  };
  price: {
    amount: number;
    currency: string;
    confidence: number;
  };
  gst: {
    rate: number;
    isGSTInvoice: boolean;
    confidence: number;
  };
  company: {
    name: string;
    confidence: number;
  };
  quantity: {
    value: number;
    unit: string;
    confidence: number;
  };
  invoiceNumber?: string;
  invoiceDate?: string;
  rawText: string;
}

export interface Material {
  id: string;
  sku: string; // Monospace SWC / SKU identifier
  item: ConfidenceField<string>;
  vendor: ConfidenceField<string>;
  price: ConfidenceField<number>;
  company: ConfidenceField<string>;
  quantity: ConfidenceField<{
    value: number;
    unit: string;
  }>;
  gst: {
    rate: number;
    isGSTInvoice: boolean;
    confidence: ConfidenceLevel;
    confidenceScore?: number;
    source: 'ai' | 'manual';
  };
  photoUrl?: string; // Preview / thumbnail
  createdAt: string;
  updatedAt: string;
  notes?: string;
  status: 'draft' | 'verified' | 'saved';
}

export interface PurchaseRecord {
  id: string;
  date: string; // ISO date string or YYYY-MM-DD
  item: string;
  sku: string;
  vendor: string;
  company: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  gstRate: number;
  gstAmount: number;
  netAmount: number;
  isGSTInvoice: boolean;
  photoUrl?: string;
  aiRecognized: boolean;
  confidenceAverage: number;
  createdAt: string;
}

export interface GatewayConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  useLiveClaudeGateway: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

export interface RecognitionMetrics {
  imageSize: number;
  processingTime: number;
  confidence: {
    item: number;
    vendor: number;
    price: number;
    gst: number;
  };
  fieldsEdited: string[];
  success: boolean;
  error?: string;
}
