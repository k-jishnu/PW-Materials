// src/hooks/useMaterials.ts
//
// ============================================================
// PHASE 1: Uses localDataService (localStorage only)
// To reconnect Supabase: replace localDataService imports with
// supabaseService equivalents and update addPurchase signature.
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { Material, MaterialRecognitionResult, PurchaseRecord } from '@/types';
import { scoreToConfidenceLevel } from './useAIRecognition';
import {
  getDraftMaterials,
  saveDraftMaterials,
  getPurchases,
  addPurchase,
  insertMaterial,
  deletePurchase,
} from '@/services/localDataService';
import confetti from 'canvas-confetti';

const mapPurchaseToMaterial = (p: PurchaseRecord): Material => ({
  id: p.id,
  sku: p.sku || `PUR-${p.id.slice(-6)}`,
  item: { value: p.item, confidence: 'high', confidenceScore: 1.0, source: p.aiRecognized ? 'ai' : 'manual' },
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
  // Drafts: loaded from localStorage immediately (no async)
  const [draftMaterials, setDraftMaterials] = useState<Material[]>(() => getDraftMaterials());

  // Saved materials: loaded once on mount from local storage
  const [savedMaterials, setSavedMaterials] = useState<Material[]>(() =>
    getPurchases().map(mapPurchaseToMaterial)
  );

  const [isLoading] = useState(false);

  // Keep draft materials synced to localStorage on every change
  useEffect(() => {
    saveDraftMaterials(draftMaterials);
  }, [draftMaterials]);

  // Reload saved materials from localStorage (used after commit/delete)
  const refreshSavedMaterials = useCallback(() => {
    setSavedMaterials(getPurchases().map(mapPurchaseToMaterial));
  }, []);

  // ---------------------------------------------------------------------------
  // Add from AI recognition result (supports multi-line invoice items)
  // ---------------------------------------------------------------------------
  const addMaterialFromRecognition = useCallback(
    (recognition: MaterialRecognitionResult, photoUrl?: string) => {
      // Multi-item invoice: each line item becomes a separate draft card
      if (recognition.allLineItems && recognition.allLineItems.length > 1) {
        const newMaterials: Material[] = recognition.allLineItems.map((lineItem, idx) => {
          const itemTax = lineItem.tax_amount || 0;
          const isTaxInvoice = itemTax > 0 || recognition.gst.isGSTInvoice;
          const inferredRate =
            lineItem.unit_price !== null && lineItem.unit_price > 0 && itemTax > 0 && lineItem.quantity
              ? Math.round((itemTax / (lineItem.quantity * lineItem.unit_price)) * 100)
              : recognition.gst.rate !== null
              ? recognition.gst.rate
              : isTaxInvoice
              ? 18
              : 0;

          return {
            id: `mat-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            sku: `SWC-${(Date.now() + idx).toString().slice(-6)}`,
            item: {
              value: lineItem.item_name || 'Unspecified Item',
              confidence: scoreToConfidenceLevel(lineItem.confidence_score),
              confidenceScore: lineItem.confidence_score,
              source: 'ai',
            },
            vendor: {
              value: recognition.vendor.name || '',
              confidence: scoreToConfidenceLevel(recognition.vendor.confidence),
              confidenceScore: recognition.vendor.confidence,
              source: 'ai',
            },
            price: {
              value: lineItem.unit_price !== undefined ? lineItem.unit_price : null,
              confidence: scoreToConfidenceLevel(lineItem.confidence_score),
              confidenceScore: lineItem.confidence_score,
              source: 'ai',
            },
            company: { value: 'PW', confidence: 'high', confidenceScore: 1.0, source: 'manual' },
            quantity: {
              value: {
                value: lineItem.quantity !== undefined ? lineItem.quantity : null,
                unit: lineItem.unit || 'Nos',
              },
              confidence: scoreToConfidenceLevel(lineItem.confidence_score),
              confidenceScore: lineItem.confidence_score,
              source: 'ai',
            },
            gst: {
              rate: inferredRate,
              isGSTInvoice: isTaxInvoice,
              confidence: scoreToConfidenceLevel(lineItem.confidence_score),
              confidenceScore: lineItem.confidence_score,
              source: 'ai',
            },
            invoiceNumber: recognition.invoiceNumber,
            invoiceDate: recognition.invoiceDate,
            photoUrl: photoUrl || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft',
            notes: lineItem.description || recognition.notes || undefined,
          };
        });

        setDraftMaterials((prev) => [...newMaterials, ...prev]);
        return newMaterials[0];
      }

      // Single item
      const generatedSKU = `SWC-${Date.now().toString().slice(-6)}`;
      const newMaterial: Material = {
        id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sku: generatedSKU,
        item: {
          value: recognition.item.name || 'Unspecified Item',
          confidence: scoreToConfidenceLevel(recognition.item.confidence),
          confidenceScore: recognition.item.confidence,
          source: 'ai',
        },
        vendor: {
          value: recognition.vendor.name || '',
          confidence: scoreToConfidenceLevel(recognition.vendor.confidence),
          confidenceScore: recognition.vendor.confidence,
          source: 'ai',
        },
        price: {
          value: recognition.price.amount !== undefined ? recognition.price.amount : null,
          confidence: scoreToConfidenceLevel(recognition.price.confidence),
          confidenceScore: recognition.price.confidence,
          source: 'ai',
        },
        company: { value: 'PW', confidence: 'high', confidenceScore: 1.0, source: 'manual' },
        quantity: {
          value: {
            value: recognition.quantity.value !== undefined ? recognition.quantity.value : null,
            unit: recognition.quantity.unit || 'Nos',
          },
          confidence: scoreToConfidenceLevel(recognition.quantity.confidence),
          confidenceScore: recognition.quantity.confidence,
          source: 'ai',
        },
        gst: {
          rate: recognition.gst.rate !== undefined ? recognition.gst.rate : null,
          isGSTInvoice:
            recognition.gst.isGSTInvoice ?? (recognition.gst.rate !== null && recognition.gst.rate > 0),
          confidence: scoreToConfidenceLevel(recognition.gst.confidence),
          confidenceScore: recognition.gst.confidence,
          source: 'ai',
        },
        invoiceNumber: recognition.invoiceNumber,
        invoiceDate: recognition.invoiceDate,
        photoUrl: photoUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        notes: recognition.notes || undefined,
      };

      setDraftMaterials((prev) => [newMaterial, ...prev]);
      return newMaterial;
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Manual material addition — local only, synchronous
  // ---------------------------------------------------------------------------
  const addManualMaterial = useCallback(
    (itemData: {
      item: string;
      vendor: string;
      price: number;
      company: string;
      qtyValue: number;
      qtyUnit: string;
      gstRate: number;
      isGSTInvoice: boolean;
    }) => {
      const res = insertMaterial({
        name: itemData.item,
        vendor: itemData.vendor,
        company: itemData.company,
        price: itemData.price,
        quantity: itemData.qtyValue,
        unit: itemData.qtyUnit,
        gstRate: itemData.gstRate,
        isGSTInvoice: itemData.isGSTInvoice,
      });

      if (!res.success) {
        return { success: false, error: res.error || 'Failed to save material.' };
      }

      // Refresh saved list immediately
      refreshSavedMaterials();
      onPurchaseAdded?.(res.data!);

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
  // Inline field editing for draft cards
  // ---------------------------------------------------------------------------
  const updateMaterialField = useCallback(
    (id: string, field: 'item' | 'vendor' | 'price' | 'company' | 'quantity' | 'gst' | 'sku', newValue: any) => {
      setDraftMaterials((prev) =>
        prev.map((mat) => {
          if (mat.id !== id) return mat;
          const updated = { ...mat, updatedAt: new Date().toISOString() };

          if (field === 'sku') {
            updated.sku = newValue;
          } else if (field === 'item') {
            updated.item = { value: newValue, confidence: 'high', source: 'manual' };
          } else if (field === 'vendor') {
            updated.vendor = { value: newValue || '', confidence: 'high', source: 'manual' };
          } else if (field === 'price') {
            const pVal =
              newValue === '' || newValue === null || isNaN(Number(newValue)) ? null : Number(newValue);
            updated.price = { value: pVal, confidence: 'high', source: 'manual' };
          } else if (field === 'company') {
            updated.company = { value: newValue || 'PW', confidence: 'high', source: 'manual' };
          } else if (field === 'quantity') {
            const qVal =
              newValue?.value === '' || newValue?.value === null || isNaN(Number(newValue?.value))
                ? null
                : Number(newValue.value);
            updated.quantity = {
              value: { value: qVal, unit: newValue?.unit || 'Nos' },
              confidence: 'high',
              source: 'manual',
            };
          } else if (field === 'gst') {
            const gVal =
              newValue?.rate === '' || newValue?.rate === null || isNaN(Number(newValue?.rate))
                ? null
                : Number(newValue.rate);
            updated.gst = {
              rate: gVal,
              isGSTInvoice: Boolean(newValue?.isGSTInvoice),
              confidence: 'high',
              source: 'manual',
            };
          }

          return updated;
        })
      );
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Delete: drafts removed immediately; saved records removed from localStorage
  // ---------------------------------------------------------------------------
  const deleteMaterial = useCallback(
    (id: string) => {
      const isDraft = draftMaterials.some((m) => m.id === id);
      if (isDraft) {
        setDraftMaterials((prev) => prev.filter((m) => m.id !== id));
        return;
      }
      // Saved record
      deletePurchase(id);
      refreshSavedMaterials();
    },
    [draftMaterials, refreshSavedMaterials]
  );

  const duplicateMaterial = useCallback((id: string) => {
    setDraftMaterials((prev) => {
      const existing = prev.find((m) => m.id === id);
      if (!existing) return prev;
      const clone: Material = {
        ...existing,
        id: `mat-${Date.now()}`,
        sku: `CPY-${Date.now().toString().slice(-5)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
      };
      return [clone, ...prev];
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Commit draft → saved purchase record (local storage)
  // ---------------------------------------------------------------------------
  const commitToPurchases = useCallback(
    (materialId: string) => {
      const mat = draftMaterials.find((m) => m.id === materialId);
      if (!mat) return;

      const priceVal = mat.price.value ?? 0;
      const qtyVal = mat.quantity.value.value ?? 1;
      const gstRateVal = mat.gst.rate ?? 0;
      const subTotal = priceVal * qtyVal;
      const gstAmount = mat.gst.isGSTInvoice && mat.gst.rate !== null ? (subTotal * gstRateVal) / 100 : 0;
      const netTotal = subTotal + gstAmount;

      const purchaseRecord: PurchaseRecord = {
        id: `pur-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        date: mat.invoiceDate || new Date().toISOString().split('T')[0],
        item: mat.item.value,
        sku: mat.sku,
        vendor: mat.vendor.value || 'Unknown Vendor',
        company: mat.company.value || 'PW',
        quantity: qtyVal,
        unit: mat.quantity.value.unit,
        unitPrice: priceVal,
        totalPrice: subTotal,
        gstRate: gstRateVal,
        gstAmount,
        netAmount: netTotal,
        isGSTInvoice: mat.gst.isGSTInvoice && mat.gst.rate !== null && mat.gst.rate > 0,
        photoUrl: mat.photoUrl,
        aiRecognized: mat.item.source === 'ai',
        confidenceAverage: mat.item.confidenceScore || 0.95,
        createdAt: new Date().toISOString(),
      };

      const res = addPurchase(purchaseRecord);
      if (!res.success) {
        alert(`Save Error: ${res.error || 'Failed to save record locally.'}`);
        return;
      }

      // Remove from draft list
      setDraftMaterials((prev) => prev.filter((m) => m.id !== materialId));
      refreshSavedMaterials();
      onPurchaseAdded?.(purchaseRecord);

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {
        // Ignore
      }
    },
    [draftMaterials, onPurchaseAdded, refreshSavedMaterials]
  );

  const commitAllToPurchases = useCallback(() => {
    // Process synchronously (local storage is fast)
    for (const mat of [...draftMaterials]) {
      commitToPurchases(mat.id);
    }
  }, [draftMaterials, commitToPurchases]);

  return {
    materials: [...draftMaterials, ...savedMaterials],
    draftMaterials,
    savedMaterials,
    isLoading,
    refreshSavedMaterials,
    addMaterialFromRecognition,
    addManualMaterial,
    updateMaterialField,
    deleteMaterial,
    duplicateMaterial,
    commitToPurchases,
    commitAllToPurchases,
    clearAllDrafts: () => setDraftMaterials([]),
  };
};
