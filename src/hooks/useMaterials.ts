// src/hooks/useMaterials.ts
//
// ============================================================
// PHASE 2 FIX: AI Recognition populates Review Modal ONLY.
// Materials list contains ONLY confirmed and saved records.
// No unreviewed AI results are ever auto-added to Materials.
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { Material, PurchaseRecord } from '@/types';
import {
  getPurchases,
  addPurchase,
  insertMaterial,
  deletePurchase,
  updatePurchase,
} from '@/services/localDataService';
import { savePhoto, deletePhoto } from '@/services/localPhotoStorage';
import { ReviewItemData } from '@/components/MaterialsList/AddMaterialModal';
import confetti from 'canvas-confetti';

const mapPurchaseToMaterial = (p: PurchaseRecord): Material => ({
  id: p.id,
  sku: p.sku || `PUR-${p.id.slice(-6)}`,
  item: { value: p.item, confidence: 'high', confidenceScore: p.confidenceAverage || 1.0, source: p.aiRecognized ? 'ai' : 'manual' },
  vendor: { value: p.vendor, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  price: { value: p.unitPrice, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  company: { value: p.company || 'PW', confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  quantity: { value: { value: p.quantity, unit: p.unit }, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  gst: { rate: p.gstRate, isGSTInvoice: p.isGSTInvoice, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  photoUrl: p.photoUrl,
  createdAt: p.createdAt || p.date,
  updatedAt: p.createdAt || p.date,
  status: 'saved',
});

export const useMaterials = (onPurchaseAdded?: (record: PurchaseRecord) => void) => {
  // Clear any legacy unconfirmed drafts from localStorage so they never contaminate the Materials list
  useEffect(() => {
    try {
      localStorage.removeItem('pw_materials_local_draft_materials');
    } catch {
      // Ignore
    }
  }, []);

  // Saved materials: loaded once on mount from local storage
  const [savedMaterials, setSavedMaterials] = useState<Material[]>(() =>
    getPurchases().map(mapPurchaseToMaterial)
  );

  const [isLoading] = useState(false);

  // Reload saved materials from localStorage (used after save/delete/update)
  const refreshSavedMaterials = useCallback(() => {
    setSavedMaterials(getPurchases().map(mapPurchaseToMaterial));
  }, []);

  // ---------------------------------------------------------------------------
  // Confirm and save items from the Review Form (Single or Multi-item)
  // ---------------------------------------------------------------------------
  const confirmMaterials = useCallback(
    async (itemsData: ReviewItemData[]) => {
      const addedRecords: PurchaseRecord[] = [];

      // Save photo to IndexedDB once if it's a data URL
      let persistentPhotoRef: string | undefined = undefined;
      const photoItem = itemsData.find((it) => it.photoUrl && it.photoUrl.startsWith('data:'));
      if (photoItem && photoItem.photoUrl) {
        const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        try {
          persistentPhotoRef = await savePhoto(photoId, photoItem.photoUrl);
        } catch (e) {
          console.warn('Failed to persist photo in IndexedDB:', e);
        }
      }

      for (const itemData of itemsData) {
        const numericPrice =
          typeof itemData.price === 'number' && !isNaN(itemData.price) ? itemData.price : 0;
        const numericQty =
          typeof itemData.qtyValue === 'number' && !isNaN(itemData.qtyValue) ? itemData.qtyValue : 0;
        const numericGst =
          itemData.isGSTInvoice && typeof itemData.gstRate === 'number' && !isNaN(itemData.gstRate)
            ? itemData.gstRate
            : 0;

        const effectivePhoto =
          persistentPhotoRef ||
          (itemData.photoUrl && itemData.photoUrl.startsWith('idb://photos/')
            ? itemData.photoUrl
            : undefined);

        const res = insertMaterial({
          name: itemData.item,
          vendor: itemData.vendor || '',
          company: itemData.company || 'PW',
          price: numericPrice,
          quantity: numericQty,
          unit: itemData.qtyUnit || "no's",
          gstRate: numericGst,
          isGSTInvoice: itemData.isGSTInvoice,
          date: itemData.date,
          invoiceNumber: itemData.invoiceNumber,
          photoUrl: effectivePhoto,
          aiRecognized: true,
          confidenceAverage: itemData.confidenceScore ?? 0.95,
        });

        if (!res.success) {
          return { success: false, error: res.error || 'Failed to save material.' };
        }
        addedRecords.push(res.data!);
        onPurchaseAdded?.(res.data!);
      }

      refreshSavedMaterials();

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {
        // Ignore
      }

      return { success: true, count: addedRecords.length };
    },
    [refreshSavedMaterials, onPurchaseAdded]
  );

  // ---------------------------------------------------------------------------
  // Manual material addition (from manual Add Material modal)
  // ---------------------------------------------------------------------------
  const addManualMaterial = useCallback(
    (itemsData: ReviewItemData[] | ReviewItemData) => {
      const list = Array.isArray(itemsData) ? itemsData : [itemsData];
      const addedRecords: PurchaseRecord[] = [];

      for (const itemData of list) {
        const numericPrice =
          typeof itemData.price === 'number' && !isNaN(itemData.price) ? itemData.price : 0;
        const numericQty =
          typeof itemData.qtyValue === 'number' && !isNaN(itemData.qtyValue) ? itemData.qtyValue : 0;
        const numericGst =
          itemData.isGSTInvoice && typeof itemData.gstRate === 'number' && !isNaN(itemData.gstRate)
            ? itemData.gstRate
            : 0;

        const res = insertMaterial({
          name: itemData.item,
          vendor: itemData.vendor || '',
          company: itemData.company || 'PW',
          price: numericPrice,
          quantity: numericQty,
          unit: itemData.qtyUnit || "no's",
          gstRate: numericGst,
          isGSTInvoice: itemData.isGSTInvoice,
          date: itemData.date,
          invoiceNumber: itemData.invoiceNumber,
          aiRecognized: false,
          confidenceAverage: 1.0,
        });

        if (!res.success) {
          return { success: false, error: res.error || 'Failed to save material.' };
        }
        addedRecords.push(res.data!);
        onPurchaseAdded?.(res.data!);
      }

      refreshSavedMaterials();

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {
        // Ignore
      }

      return { success: true };
    },
    [refreshSavedMaterials, onPurchaseAdded]
  );

  // ---------------------------------------------------------------------------
  // Inline field editing for saved cards
  // ---------------------------------------------------------------------------
  const updateMaterialField = useCallback(
    (id: string, field: 'item' | 'vendor' | 'price' | 'company' | 'quantity' | 'gst' | 'sku', newValue: any) => {
      const updates: Partial<PurchaseRecord> = {};

      if (field === 'item') {
        updates.item = newValue;
      } else if (field === 'vendor') {
        updates.vendor = newValue || '';
      } else if (field === 'price') {
        const pVal = newValue === '' || newValue === null || isNaN(Number(newValue)) ? 0 : Number(newValue);
        updates.unitPrice = pVal;
      } else if (field === 'company') {
        updates.company = newValue || 'PW';
      } else if (field === 'quantity') {
        const qVal =
          newValue?.value === '' || newValue?.value === null || isNaN(Number(newValue?.value))
            ? 0
            : Number(newValue.value);
        updates.quantity = qVal;
        updates.unit = newValue?.unit || "no's";
      } else if (field === 'gst') {
        const gVal =
          newValue?.rate === '' || newValue?.rate === null || isNaN(Number(newValue?.rate))
            ? 0
            : Number(newValue.rate);
        updates.gstRate = gVal;
        updates.isGSTInvoice = Boolean(newValue?.isGSTInvoice);
      }

      updatePurchase(id, updates);
      refreshSavedMaterials();
    },
    [refreshSavedMaterials]
  );

  // ---------------------------------------------------------------------------
  // Delete saved record (with safe photo cleanup)
  // ---------------------------------------------------------------------------
  const deleteMaterial = useCallback(
    async (id: string) => {
      const allPurchases = getPurchases();
      const target = allPurchases.find((p) => p.id === id);
      if (target?.photoUrl && target.photoUrl.startsWith('idb://photos/')) {
        const isShared = allPurchases.some((p) => p.id !== id && p.photoUrl === target.photoUrl);
        if (!isShared) {
          try {
            await deletePhoto(target.photoUrl);
          } catch (e) {
            console.warn('Error deleting photo from storage:', e);
          }
        }
      }
      deletePurchase(id);
      refreshSavedMaterials();
    },
    [refreshSavedMaterials]
  );

  // ---------------------------------------------------------------------------
  // Duplicate saved record
  // ---------------------------------------------------------------------------
  const duplicateMaterial = useCallback(
    (id: string) => {
      const existing = getPurchases().find((p) => p.id === id);
      if (!existing) return;

      const clone: PurchaseRecord = {
        ...existing,
        id: `pur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sku: `CPY-${Date.now().toString().slice(-5)}`,
        createdAt: new Date().toISOString(),
      };
      addPurchase(clone);
      refreshSavedMaterials();
      onPurchaseAdded?.(clone);
    },
    [refreshSavedMaterials, onPurchaseAdded]
  );

  return {
    materials: savedMaterials,
    savedMaterials,
    draftMaterials: [] as Material[], // Always empty; drafts only live in active review modal
    isLoading,
    refreshSavedMaterials,
    confirmMaterials,
    addManualMaterial,
    updateMaterialField,
    deleteMaterial,
    duplicateMaterial,
    commitToPurchases: () => {},
    commitAllToPurchases: () => {},
    clearAllDrafts: () => {},
  };
};
