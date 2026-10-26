// src/services/localDataService.ts
//
// ============================================================
// PHASE 1 — LOCAL-ONLY DATA SERVICE
// ============================================================
// This module replaces Supabase reads and writes during the
// Materials section stabilisation phase.
//
// - All data is persisted in browser localStorage.
// - Records survive page refreshes in the same browser.
// - No network calls, no Supabase SDK usage.
// - Interface intentionally mirrors SupabaseService so that
//   reconnecting the database later only requires changing the
//   import in useMaterials.ts and App.tsx.
// - This is NOT a production multi-user database.
// ============================================================

import { PurchaseRecord, Material } from '@/types';

const LOCAL_PURCHASES_KEY = 'pw_materials_local_purchases';
const LOCAL_DRAFT_MATERIALS_KEY = 'pw_materials_local_draft_materials';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // Ignore parse errors — return fallback
  }
  return fallback;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore write errors (private browsing, quota exceeded)
  }
}

// ---------------------------------------------------------------------------
// Draft Materials (in-progress, not yet confirmed)
// ---------------------------------------------------------------------------

export function getDraftMaterials(): Material[] {
  return loadFromStorage<Material[]>(LOCAL_DRAFT_MATERIALS_KEY, []);
}

export function saveDraftMaterials(materials: Material[]): void {
  saveToStorage(LOCAL_DRAFT_MATERIALS_KEY, materials);
}

// ---------------------------------------------------------------------------
// Saved / Confirmed Purchase Records (the local ledger)
// ---------------------------------------------------------------------------

export function getPurchases(): PurchaseRecord[] {
  return loadFromStorage<PurchaseRecord[]>(LOCAL_PURCHASES_KEY, []);
}

/**
 * Add or update a single confirmed purchase record.
 * Returns { success: true } always — no network required.
 */
export function addPurchase(
  record: PurchaseRecord
): { success: boolean; error?: string } {
  try {
    const current = getPurchases();
    // Prepend; deduplicate by id
    const updated = [record, ...current.filter((r) => r.id !== record.id)];
    saveToStorage(LOCAL_PURCHASES_KEY, updated);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Failed to save record locally.' };
  }
}

/**
 * Add a material manually (no image, no AI).
 * Validates required fields.
 * Returns { success: true, data: PurchaseRecord } on success.
 */
export function insertMaterial(materialData: {
  name: string;
  vendor: string;
  company?: string;
  price: number;
  quantity: number;
  unit?: string;
  gstRate?: number;
  isGSTInvoice?: boolean;
}): { success: boolean; data?: PurchaseRecord; error?: string } {
  // --- Field validation ---
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

  const sku = `MAN-${Date.now().toString().slice(-6)}`;
  const isGST = Boolean(materialData.isGSTInvoice);
  const rate = isGST ? Number(materialData.gstRate ?? 18) : 0;
  const subTotal = materialData.price * materialData.quantity;
  const gstAmount = (subTotal * rate) / 100;
  const netAmount = subTotal + gstAmount;

  const record: PurchaseRecord = {
    id: `pur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString().split('T')[0],
    item: materialData.name.trim(),
    sku,
    vendor: materialData.vendor.trim(),
    company: materialData.company?.trim() || 'PW',
    quantity: materialData.quantity,
    unit: materialData.unit || "no's",
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

  const result = addPurchase(record);
  if (!result.success) return result;
  return { success: true, data: record };
}

/**
 * Delete a purchase record by id.
 */
export function deletePurchase(id: string): void {
  const current = getPurchases();
  saveToStorage(LOCAL_PURCHASES_KEY, current.filter((r) => r.id !== id));
}

/**
 * Update a purchase record field.
 * Returns { success: boolean }.
 */
export function updatePurchase(
  id: string,
  updates: Partial<PurchaseRecord>
): { success: boolean; error?: string } {
  try {
    const current = getPurchases();
    const index = current.findIndex((r) => r.id === id);
    if (index === -1) return { success: false, error: 'Record not found.' };
    current[index] = { ...current[index], ...updates };
    saveToStorage(LOCAL_PURCHASES_KEY, current);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Update failed.' };
  }
}

// ---------------------------------------------------------------------------
// Storage mode indicator — used by UI to show correct labels
// ---------------------------------------------------------------------------

export const STORAGE_MODE = 'local' as const;
export const STORAGE_LABEL = 'Local Storage' as const;
export const STORAGE_DESCRIPTION =
  'Data is saved in this browser only. This is a development mode — not shared across users or devices.' as const;
