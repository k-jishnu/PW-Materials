// src/services/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PurchaseRecord, Material, SupabaseConfig } from '@/types';
import { INITIAL_PURCHASE_HISTORY } from './sampleData';

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
    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_CONFIG;
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
      const { error } = await this.client.from('purchases').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Connected successfully to Supabase!' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection failed' };
    }
  }

  // Purchases operations
  public async getPurchases(): Promise<PurchaseRecord[]> {
    if (this.client) {
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

    // Local storage fallback
    try {
      const local = localStorage.getItem(LOCAL_PURCHASES_KEY);
      if (local) {
        const parsed: PurchaseRecord[] = JSON.parse(local);
        // Filter out any legacy dummy records (e.g. pur-101 .. pur-105)
        const clean = parsed.filter((r) => !r.id.startsWith('pur-10'));
        return clean;
      }
    } catch {
      // Ignore
    }

    return [];
  }

  public async addPurchase(record: PurchaseRecord): Promise<void> {
    // Save to local storage first for resilience
    const current = await this.getPurchases();
    const updated = [record, ...current.filter((r) => r.id !== record.id)];
    this.savePurchasesLocally(updated);

    // Save to Supabase if configured
    if (this.client) {
      try {
        const { error } = await this.client.from('purchases').insert([record]);
        if (error) {
          console.warn('Supabase insert warning:', error.message);
        }
      } catch (e) {
        console.error('Supabase insert failed:', e);
      }
    }
  }

  public async deletePurchase(id: string): Promise<void> {
    const current = await this.getPurchases();
    const filtered = current.filter((r) => r.id !== id);
    this.savePurchasesLocally(filtered);

    if (this.client) {
      try {
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
    return `-- PW Materials Supabase SQL Schema
-- Run this in your Supabase SQL Editor:

-- 1. Purchases Table (Bank-Statement style records)
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  item TEXT NOT NULL,
  sku TEXT,
  vendor TEXT NOT NULL,
  company TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'Nos',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL DEFAULT 0,
  is_gst_invoice BOOLEAN DEFAULT true,
  photo_url TEXT,
  ai_recognized BOOLEAN DEFAULT false,
  confidence_average NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Materials Table (Catalog/Inventory)
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  default_vendor TEXT,
  category TEXT,
  unit TEXT DEFAULT 'Nos',
  standard_price NUMERIC,
  gst_rate NUMERIC DEFAULT 18,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  gstin TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy date queries
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_vendor ON purchases(vendor);
`;
  }
}

export const supabaseService = new SupabaseService();
