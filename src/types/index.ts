// src/types/index.ts

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface ConfidenceField<T> {
  value: T;
  confidence: ConfidenceLevel;
  confidenceScore?: number; // 0.0 to 1.0
  source: 'ai' | 'manual';
}

export interface ExtractedLineItemData {
  item_name: string;
  description?: string | null;
  quantity: number | null;
  unit: string;
  unit_price: number | null;
  tax_amount?: number | null;
  line_total: number | null;
  confidence_score: number;
}

export interface MaterialRecognitionResult {
  documentType?: 'invoice' | 'receipt' | 'material_photo' | 'unknown';
  item: {
    name: string;
    confidence: number; // 0 to 1
  };
  vendor: {
    name: string | null;
    confidence: number;
  };
  price: {
    amount: number | null;
    currency: string;
    confidence: number;
  };
  gst: {
    rate: number | null;
    isGSTInvoice: boolean;
    confidence: number;
  };
  company: {
    name: string;
    confidence: number;
  };
  quantity: {
    value: number | null;
    unit: string;
    confidence: number;
  };
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  subtotal?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  notes?: string;
  rawText: string;
  allLineItems?: ExtractedLineItemData[];
}

export interface Material {
  id: string;
  sku: string; // Monospace SWC / SKU identifier
  item: ConfidenceField<string>;
  vendor: ConfidenceField<string>;
  price: ConfidenceField<number | null>;
  company: ConfidenceField<string>;
  quantity: ConfidenceField<{
    value: number | null;
    unit: string;
  }>;
  gst: {
    rate: number | null;
    isGSTInvoice: boolean;
    confidence: ConfidenceLevel;
    confidenceScore?: number;
    source: 'ai' | 'manual';
  };
  invoiceNumber?: string;
  invoiceDate?: string;
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
  invoiceNumber?: string;
}

// Normalized Database Entities
export interface InvoiceEntity {
  id: string;
  owner_id?: string | null;
  supplier_name?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string | null;
  storage_path?: string | null;
  original_filename?: string | null;
  extraction_status: 'pending' | 'extracted' | 'confirmed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface InvoiceItemEntity {
  id: string;
  invoice_id: string;
  material_id?: string | null;
  item_name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_amount?: number | null;
  line_total: number;
  confidence_score?: number | null;
  review_status: 'draft' | 'confirmed' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface CatalogMaterialEntity {
  id: string;
  owner_id?: string | null;
  sku: string;
  name: string;
  normalized_name?: string | null;
  description?: string | null;
  default_unit?: string | null;
  standard_price: number;
  category?: string | null;
  created_at: string;
  updated_at: string;
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


// ============================================================================
// AUTHENTICATION & USER MANAGEMENT TYPES
// ============================================================================

export type UserRole = 'ROOT_ADMIN' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  registration_method: string;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  last_login_at?: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  target_id?: string | null;
  target_type?: string | null;
  details?: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
}
