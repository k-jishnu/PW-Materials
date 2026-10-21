-- ==============================================================================
-- PW Materials: Complete Supabase PostgreSQL Schema & Security Migration
-- Version: 20261021_init_materials_schema.sql
-- Description: Normalized schema for invoices, materials catalog, invoice items,
--              Row-Level Security (RLS) policies, indexes, and Storage bucket.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- A. Invoices Table: Stores invoice-level metadata extracted from receipts/bills
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

-- B. Materials Table: Normalized Catalog of Materials/Items
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  normalized_name TEXT,
  description TEXT,
  default_unit TEXT DEFAULT 'Nos',
  standard_price NUMERIC(12, 2) DEFAULT 0 CHECK (standard_price >= 0),
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- C. Invoice Items Table: Individual material line items purchased on an invoice
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

-- D. Purchases Table: Backward-compatible flat bank-statement table
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

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_invoices_owner ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON public.invoices(supplier_name);
CREATE INDEX IF NOT EXISTS idx_invoices_num ON public.invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_materials_owner ON public.materials(owner_id);
CREATE INDEX IF NOT EXISTS idx_materials_sku ON public.materials(sku);
CREATE INDEX IF NOT EXISTS idx_materials_norm_name ON public.materials(normalized_name);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_material ON public.invoice_items(material_id);

CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(date DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_vendor ON public.purchases(vendor);

-- ==============================================================================
-- 4. UPDATED_AT TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON public.invoices;
CREATE TRIGGER trigger_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_materials_updated_at ON public.materials;
CREATE TRIGGER trigger_materials_updated_at
BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_invoice_items_updated_at ON public.invoice_items;
CREATE TRIGGER trigger_invoice_items_updated_at
BEFORE UPDATE ON public.invoice_items
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Invoices Policies: Authenticated users manage own invoices; anon/local fallback allowed when unauthenticated
DROP POLICY IF EXISTS "Users can read permitted invoices" ON public.invoices;
CREATE POLICY "Users can read permitted invoices" ON public.invoices
FOR SELECT USING (
  auth.uid() = owner_id OR owner_id IS NULL OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Users can insert permitted invoices" ON public.invoices;
CREATE POLICY "Users can insert permitted invoices" ON public.invoices
FOR INSERT WITH CHECK (
  auth.uid() = owner_id OR owner_id IS NULL OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Users can update permitted invoices" ON public.invoices;
CREATE POLICY "Users can update permitted invoices" ON public.invoices
FOR UPDATE USING (
  auth.uid() = owner_id OR owner_id IS NULL OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Users can delete permitted invoices" ON public.invoices;
CREATE POLICY "Users can delete permitted invoices" ON public.invoices
FOR DELETE USING (
  auth.uid() = owner_id OR owner_id IS NULL OR auth.role() = 'anon'
);

-- Materials Policies
DROP POLICY IF EXISTS "Users can read permitted materials" ON public.materials;
CREATE POLICY "Users can read permitted materials" ON public.materials
FOR SELECT USING (
  auth.uid() = owner_id OR owner_id IS NULL OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Users can insert permitted materials" ON public.materials;
CREATE POLICY "Users can insert permitted materials" ON public.materials
FOR INSERT WITH CHECK (
  auth.uid() = owner_id OR owner_id IS NULL OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Users can update permitted materials" ON public.materials;
CREATE POLICY "Users can update permitted materials" ON public.materials
FOR UPDATE USING (
  auth.uid() = owner_id OR owner_id IS NULL OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Users can delete permitted materials" ON public.materials;
CREATE POLICY "Users can delete permitted materials" ON public.materials
FOR DELETE USING (
  auth.uid() = owner_id OR owner_id IS NULL OR auth.role() = 'anon'
);

-- Invoice Items Policies (inheriting invoice ownership)
DROP POLICY IF EXISTS "Users can read permitted invoice_items" ON public.invoice_items;
CREATE POLICY "Users can read permitted invoice_items" ON public.invoice_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.invoices inv
    WHERE inv.id = invoice_items.invoice_id
    AND (inv.owner_id = auth.uid() OR inv.owner_id IS NULL OR auth.role() = 'anon')
  )
);

DROP POLICY IF EXISTS "Users can insert permitted invoice_items" ON public.invoice_items;
CREATE POLICY "Users can insert permitted invoice_items" ON public.invoice_items
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices inv
    WHERE inv.id = invoice_items.invoice_id
    AND (inv.owner_id = auth.uid() OR inv.owner_id IS NULL OR auth.role() = 'anon')
  )
);

DROP POLICY IF EXISTS "Users can update permitted invoice_items" ON public.invoice_items;
CREATE POLICY "Users can update permitted invoice_items" ON public.invoice_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.invoices inv
    WHERE inv.id = invoice_items.invoice_id
    AND (inv.owner_id = auth.uid() OR inv.owner_id IS NULL OR auth.role() = 'anon')
  )
);

DROP POLICY IF EXISTS "Users can delete permitted invoice_items" ON public.invoice_items;
CREATE POLICY "Users can delete permitted invoice_items" ON public.invoice_items
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.invoices inv
    WHERE inv.id = invoice_items.invoice_id
    AND (inv.owner_id = auth.uid() OR inv.owner_id IS NULL OR auth.role() = 'anon')
  )
);

-- Purchases Policies (Backward Compatibility)
DROP POLICY IF EXISTS "Allow select purchases" ON public.purchases;
CREATE POLICY "Allow select purchases" ON public.purchases
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert purchases" ON public.purchases;
CREATE POLICY "Allow insert purchases" ON public.purchases
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete purchases" ON public.purchases;
CREATE POLICY "Allow delete purchases" ON public.purchases
FOR DELETE USING (true);

-- ==============================================================================
-- 6. SUPABASE STORAGE BUCKET CONFIGURATION
-- ==============================================================================
-- Create the private 'invoices' storage bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage Policies for 'invoices' bucket
DROP POLICY IF EXISTS "Allow authenticated/anon upload invoices" ON storage.objects;
CREATE POLICY "Allow authenticated/anon upload invoices" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices'
);

DROP POLICY IF EXISTS "Allow select invoices storage" ON storage.objects;
CREATE POLICY "Allow select invoices storage" ON storage.objects
FOR SELECT USING (
  bucket_id = 'invoices'
);
