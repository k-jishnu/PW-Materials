// src/services/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PurchaseRecord, Material, SupabaseConfig } from '@/types';

const SUPABASE_STORAGE_KEY = 'pw_materials_supabase_config';
const LOCAL_PURCHASES_KEY = 'pw_materials_local_purchases';
const LOCAL_MATERIALS_KEY = 'pw_materials_local_draft_materials';

const DEFAULT_CONFIG: SupabaseConfig = {
  url: '',
  anonKey: '',
  isConnected: false,
};

class SupabaseService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig;

  constructor() {
    this.config = this.loadConfig();
    this.initClient();
  }

  public getConfig(): SupabaseConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<SupabaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignore
    }
    this.initClient();
  }

  private loadConfig(): SupabaseConfig {
    // 1. Check environment variables first (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey =
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
      (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      '';

    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          url: parsed.url || envUrl,
          anonKey: parsed.anonKey || envKey,
          isConnected: false,
        };
      }
    } catch {
      // Ignore
    }

    return {
      url: envUrl,
      anonKey: envKey,
      isConnected: false,
    };
  }

  private initClient(): void {
    if (this.config.url && this.config.anonKey) {
      try {
        this.client = createClient(this.config.url, this.config.anonKey);
        this.config.isConnected = true;
      } catch (e) {
        console.error('Supabase init error:', e);
        this.client = null;
        this.config.isConnected = false;
      }
    } else {
      this.client = null;
      this.config.isConnected = false;
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.client) {
      return {
        success: false,
        message: 'Supabase URL or Anon Key is missing. Using local persistent storage.',
      };
    }
    try {
      // First check invoices table
      const { error: invErr } = await this.client.from('invoices').select('id').limit(1);
      if (!invErr || invErr.code === 'PGRST116') {
        return { success: true, message: 'Connected successfully to Supabase (invoices schema active)!' };
      }

      // Check purchases fallback
      const { error } = await this.client.from('purchases').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Connected successfully to Supabase!' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection failed' };
    }
  }

  /**
   * Uploads an invoice document/image to the Supabase Storage bucket 'invoices'
   */
  public async uploadInvoiceImage(base64Data: string, filename?: string): Promise<string | null> {
    if (!this.client || !base64Data || !base64Data.startsWith('data:')) return null;

    try {
      const mimeMatch = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const cleanBase64 = base64Data.replace(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/, '');

      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';
      const safeFilename = filename
        ? filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        : `invoice_${Date.now()}.${ext}`;

      const storagePath = `uploads/${Date.now()}_${safeFilename}`;

      const { data, error } = await this.client.storage
        .from('invoices')
        .upload(storagePath, blob, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        console.warn('[Supabase Storage] Notice:', error.message);
        return null;
      }

      return data.path;
    } catch (err: any) {
      console.warn('[Supabase Storage] Upload error:', err.message);
      return null;
    }
  }

  /**
   * Loads purchases from Supabase invoices/items or fallback table
   */
  public async getPurchases(): Promise<PurchaseRecord[]> {
    if (this.client) {
      // 1. Try querying normalized invoices with joined invoice_items
      try {
        const { data: invoicesData, error: invErr } = await this.client
          .from('invoices')
          .select('*, invoice_items(*)')
          .order('invoice_date', { ascending: false });

        if (!invErr && invoicesData && invoicesData.length > 0) {
          const records: PurchaseRecord[] = [];
          for (const inv of invoicesData) {
            const items = inv.invoice_items || [];
            if (items.length > 0) {
              for (const it of items) {
                const sub = (it.unit_price || 0) * (it.quantity || 1);
                const gst = it.tax_amount || 0;
                records.push({
                  id: it.id || `pur-${Date.now()}`,
                  date: inv.invoice_date || new Date().toISOString().split('T')[0],
                  item: it.item_name,
                  sku: `INV-${(inv.invoice_number || 'DOC').replace(/[^a-zA-Z0-9]/g, '')}`,
                  vendor: inv.supplier_name || 'Vendor',
                  company: 'PW',
                  quantity: Number(it.quantity) || 1,
                  unit: it.unit || 'Nos',
                  unitPrice: Number(it.unit_price) || 0,
                  totalPrice: sub,
                  gstRate: sub > 0 && gst > 0 ? Math.round((gst / sub) * 100) : 18,
                  gstAmount: gst,
                  netAmount: sub + gst,
                  isGSTInvoice: gst > 0,
                  photoUrl: inv.storage_path || undefined,
                  aiRecognized: true,
                  confidenceAverage: Number(it.confidence_score) || 0.95,
                  createdAt: inv.created_at || new Date().toISOString(),
                });
              }
            } else {
              records.push({
                id: inv.id,
                date: inv.invoice_date || new Date().toISOString().split('T')[0],
                item: inv.notes || 'Purchased Materials',
                sku: `INV-${(inv.invoice_number || 'DOC').slice(-6)}`,
                vendor: inv.supplier_name || 'Vendor',
                company: 'PW',
                quantity: 1,
                unit: 'Nos',
                unitPrice: Number(inv.subtotal) || Number(inv.total_amount) || 0,
                totalPrice: Number(inv.subtotal) || Number(inv.total_amount) || 0,
                gstRate: 18,
                gstAmount: Number(inv.tax_amount) || 0,
                netAmount: Number(inv.total_amount) || 0,
                isGSTInvoice: Number(inv.tax_amount) > 0,
                photoUrl: inv.storage_path || undefined,
                aiRecognized: true,
                confidenceAverage: 0.95,
                createdAt: inv.created_at || new Date().toISOString(),
              });
            }
          }
          if (records.length > 0) return records;
        }
      } catch (e) {
        console.warn('Invoices table query notice, trying purchases table:', e);
      }

      // 2. Fallback to purchases table
      try {
        const { data, error } = await this.client
          .from('purchases')
          .select('*')
          .order('date', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as PurchaseRecord[];
        }
      } catch (e) {
        console.warn('Falling back to local storage for purchases:', e);
      }
    }

    // 3. Local storage fallback for offline resilience
    try {
      const local = localStorage.getItem(LOCAL_PURCHASES_KEY);
      if (local) {
        const parsed: PurchaseRecord[] = JSON.parse(local);
        const clean = parsed.filter((r) => !r.id.startsWith('pur-10'));
        return clean;
      }
    } catch {
      // Ignore
    }

    return [];
  }

  /**
   * Directly inserts a confirmed material into the Supabase 'materials' table,
   * while also syncing to purchases and local cache.
   */
  public async insertMaterial(materialData: {
    name: string;
    sku?: string;
    vendor: string;
    company?: string;
    price: number;
    quantity: number;
    unit?: string;
    gstRate?: number;
    isGSTInvoice?: boolean;
    description?: string;
    category?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    // 1. Validation
    if (!materialData.name || !materialData.name.trim()) {
      return { success: false, error: 'Material Description / Name is required.' };
    }
    if (!materialData.vendor || !materialData.vendor.trim()) {
      return { success: false, error: 'Supplier / Vendor is required.' };
    }
    if (materialData.price < 0) {
      return { success: false, error: 'Price cannot be negative.' };
    }
    if (materialData.quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than zero.' };
    }

    const sku = materialData.sku?.trim() || `MAN-${Date.now().toString().slice(-6)}`;
    const subTotal = materialData.price * materialData.quantity;
    const isGST = Boolean(materialData.isGSTInvoice);
    const rate = isGST ? Number(materialData.gstRate ?? 18) : 0;
    const gstAmount = (subTotal * rate) / 100;
    const netAmount = subTotal + gstAmount;

    if (!this.client) {
      return { success: false, error: 'Supabase client is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.' };
    }

    try {
      // Derive authenticated owner_id if session exists
      let ownerId: string | null = null;
      try {
        const { data: { user } } = await this.client.auth.getUser();
        ownerId = user?.id || null;
      } catch {
        ownerId = null;
      }

      // 1. Insert into public.materials
      const { data: matRecord, error: matError } = await this.client
        .from('materials')
        .insert([
          {
            owner_id: ownerId,
            sku,
            name: materialData.name.trim(),
            normalized_name: materialData.name.toLowerCase().trim(),
            description: materialData.description || null,
            default_unit: materialData.unit || 'Nos',
            standard_price: materialData.price,
            category: materialData.category || 'General',
          },
        ])
        .select()
        .single();

      if (matError) {
        console.error('[Supabase Insert Error]:', matError);
        return { success: false, error: matError.message || 'Database error inserting material.' };
      }

      // 2. Also insert corresponding purchase record for ledger & export consistency
      const purchaseRecord: PurchaseRecord = {
        id: `pur-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        item: materialData.name.trim(),
        sku,
        vendor: materialData.vendor.trim(),
        company: materialData.company?.trim() || 'PW',
        quantity: materialData.quantity,
        unit: materialData.unit || 'Nos',
        unitPrice: materialData.price,
        totalPrice: subTotal,
        gstRate: rate,
        gstAmount,
        netAmount,
        isGSTInvoice: isGST,
        aiRecognized: false,
        confidenceAverage: 1.0,
        createdAt: new Date().toISOString(),
      };

      try {
        await this.client.from('purchases').insert([purchaseRecord]);
      } catch (err: any) {
        console.warn('Notice: purchases sync secondary table:', err?.message);
      }

      // Update local storage cache
      const localPurchases = await this.getPurchases();
      this.savePurchasesLocally([purchaseRecord, ...localPurchases.filter((p) => p.id !== purchaseRecord.id)]);

      return { success: true, data: matRecord };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to Supabase.' };
    }
  }

  /**
   * Fetches materials from the Supabase 'materials' table
   */
  public async getMaterials(): Promise<any[]> {
    if (this.client) {
      try {
        const { data, error } = await this.client
          .from('materials')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data;
        }
      } catch (err: any) {
        console.warn('Error fetching materials from Supabase:', err.message);
      }
    }
    return [];
  }

  /**
   * Adds a purchase record to Supabase and local storage
   */
  public async addPurchase(
    record: PurchaseRecord,
    materialSource?: Material
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Save to local storage first for resilience
    const current = await this.getPurchases();
    const updated = [record, ...current.filter((r) => r.id !== record.id)];
    this.savePurchasesLocally(updated);

    // 2. Save to Supabase if configured
    if (this.client) {
      try {
        let storagePath: string | null = null;
        if (materialSource?.photoUrl && materialSource.photoUrl.startsWith('data:')) {
          storagePath = await this.uploadInvoiceImage(materialSource.photoUrl);
        }

        let ownerId: string | null = null;
        try {
          const { data: { user } } = await this.client.auth.getUser();
          ownerId = user?.id || null;
        } catch {
          ownerId = null;
        }

        // A. Insert into normalized invoices & invoice_items
        const invoiceUUID = crypto.randomUUID();
        const { error: invError } = await this.client.from('invoices').insert([
          {
            id: invoiceUUID,
            owner_id: ownerId,
            supplier_name: record.vendor,
            invoice_number: materialSource?.invoiceNumber || `INV-${record.id.slice(-6)}`,
            invoice_date: record.date,
            currency: 'INR',
            subtotal: record.totalPrice,
            tax_amount: record.gstAmount,
            total_amount: record.netAmount,
            storage_path: storagePath || record.photoUrl || null,
            notes: materialSource?.notes || null,
            extraction_status: 'confirmed',
          },
        ]);

        if (invError) {
          console.error('[Supabase Invoices Error]:', invError);
          return { success: false, error: invError.message };
        }

        // B. Insert into invoice_items
        const { error: itemError } = await this.client.from('invoice_items').insert([
          {
            invoice_id: invoiceUUID,
            item_name: record.item,
            description: materialSource?.notes || null,
            quantity: record.quantity,
            unit: record.unit,
            unit_price: record.unitPrice,
            tax_amount: record.gstAmount,
            line_total: record.netAmount,
            confidence_score: record.confidenceAverage,
            review_status: 'confirmed',
          },
        ]);

        if (itemError) {
          console.error('[Supabase Invoice Items Error]:', itemError);
          return { success: false, error: itemError.message };
        }

        // C. Upsert into materials catalog
        const { error: matError } = await this.client.from('materials').upsert(
          [
            {
              owner_id: ownerId,
              sku: record.sku,
              name: record.item,
              normalized_name: record.item.toLowerCase().trim(),
              default_unit: record.unit,
              standard_price: record.unitPrice,
            },
          ],
          { onConflict: 'sku' }
        );

        if (matError) {
          console.warn('[Supabase Materials Upsert Notice]:', matError.message);
        }

        // D. Sync to purchases table for backward compatibility
        const { error: purError } = await this.client.from('purchases').upsert([record], { onConflict: 'id' });
        if (purError) {
          console.warn('[Supabase Purchases Sync Notice]:', purError.message);
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Supabase request failed.' };
      }
    }

    return { success: true };
  }

  public async deletePurchase(id: string): Promise<void> {
    const current = await this.getPurchases();
    const filtered = current.filter((r) => r.id !== id);
    this.savePurchasesLocally(filtered);

    if (this.client) {
      try {
        await this.client.from('invoice_items').delete().eq('id', id);
        await this.client.from('purchases').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase delete error:', e);
      }
    }
  }

  private savePurchasesLocally(records: PurchaseRecord[]): void {
    try {
      localStorage.setItem(LOCAL_PURCHASES_KEY, JSON.stringify(records));
    } catch {
      // Ignore
    }
  }

  // Draft Materials operations
  public getDraftMaterials(): Material[] {
    try {
      const stored = localStorage.getItem(LOCAL_MATERIALS_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // Ignore
    }
    return [];
  }

  public saveDraftMaterials(materials: Material[]): void {
    try {
      localStorage.setItem(LOCAL_MATERIALS_KEY, JSON.stringify(materials));
    } catch {
      // Ignore
    }
  }

  public getSupabaseSQLSchema(): string {
    return `-- ==============================================================================
-- PW Materials: Complete Supabase PostgreSQL Schema & Security Migration
-- Version: 20261021_init_materials_schema.sql
-- Description: Normalized schema for invoices, materials catalog, invoice items,
--              Row-Level Security (RLS) policies, indexes, and Storage bucket.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Invoices Table: Stores invoice-level metadata
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  supplier_name TEXT,
  invoice_number TEXT,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT DEFAULT 'INR' NOT NULL,
  subtotal NUMERIC(12, 2) DEFAULT 0 CHECK (subtotal >= 0),
  tax_amount NUMERIC(12, 2) DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  storage_path TEXT,
  original_filename TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (extraction_status IN ('pending', 'extracted', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Materials Table: Normalized Catalog of Materials/Items
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sku TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT,
  description TEXT,
  default_unit TEXT DEFAULT 'Nos',
  standard_price NUMERIC(12, 2) DEFAULT 0 CHECK (standard_price >= 0),
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Invoice Items Table: Individual material line items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit TEXT DEFAULT 'Nos',
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_amount NUMERIC(12, 2) DEFAULT 0 CHECK (tax_amount >= 0),
  line_total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
  confidence_score NUMERIC(4, 3) CHECK (confidence_score >= 0 AND confidence_score <= 1.0),
  review_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (review_status IN ('draft', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Purchases Table (Backward Compatibility)
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  item TEXT NOT NULL,
  sku TEXT,
  vendor TEXT NOT NULL,
  company TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit TEXT DEFAULT 'Nos',
  unit_price NUMERIC NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  is_gst_invoice BOOLEAN DEFAULT true,
  photo_url TEXT,
  ai_recognized BOOLEAN DEFAULT false,
  confidence_average NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON public.invoices(supplier_name);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select items" ON public.invoice_items FOR SELECT USING (true);
CREATE POLICY "Allow insert items" ON public.invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select materials" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Allow insert materials" ON public.materials FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select purchases" ON public.purchases FOR SELECT USING (true);
CREATE POLICY "Allow insert purchases" ON public.purchases FOR INSERT WITH CHECK (true);
`;
  }
}

export const supabaseService = new SupabaseService();
