// src/hooks/useMaterials.ts
import { useState, useCallback, useEffect } from 'react';
import { Material, MaterialRecognitionResult, PurchaseRecord } from '@/types';
import { scoreToConfidenceLevel } from './useAIRecognition';
import { supabaseService } from '@/services/supabaseClient';
import confetti from 'canvas-confetti';

const mapPurchaseToMaterial = (p: PurchaseRecord): Material => ({
  id: p.id,
  sku: p.sku || `PUR-${p.id.slice(-6)}`,
  item: { value: p.item, confidence: 'high', confidenceScore: 1.0, source: p.aiRecognized ? 'ai' : 'manual' },
  vendor: { value: p.vendor, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  price: { value: p.unitPrice, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  company: { value: p.company || 'PW Materials', confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  quantity: { value: { value: p.quantity, unit: p.unit }, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  gst: { rate: p.gstRate, isGSTInvoice: p.isGSTInvoice, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
  photoUrl: p.photoUrl,
  createdAt: p.createdAt || p.date,
  updatedAt: p.createdAt || p.date,
  status: 'saved',
});

export const useMaterials = (onPurchaseAdded?: (record: PurchaseRecord) => void) => {
  const [draftMaterials, setDraftMaterials] = useState<Material[]>(() => {
    return supabaseService.getDraftMaterials();
  });
  const [savedMaterials, setSavedMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const purchases = await supabaseService.getPurchases();
      const mapped = purchases.map(mapPurchaseToMaterial);
      setSavedMaterials(mapped);
    } catch (e) {
      console.warn('Error refreshing materials from Supabase:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMaterials();
  }, [refreshMaterials]);

  // Keep draft materials synced to local storage
  useEffect(() => {
    supabaseService.saveDraftMaterials(draftMaterials);
  }, [draftMaterials]);

  // Autofill material from AI recognition result (supports multi-line items from invoices)
  const addMaterialFromRecognition = useCallback(
    (recognition: MaterialRecognitionResult, photoUrl?: string) => {
      // If multiple line items were detected in the invoice, add each as a reviewable item
      if (recognition.allLineItems && recognition.allLineItems.length > 1) {
        const newMaterials: Material[] = recognition.allLineItems.map((lineItem, idx) => {
          const itemTax = lineItem.tax_amount || 0;
          const isTaxInvoice = itemTax > 0 || recognition.gst.isGSTInvoice;
          const inferredRate = lineItem.unit_price > 0 && itemTax > 0
            ? Math.round((itemTax / (lineItem.quantity * lineItem.unit_price)) * 100)
            : recognition.gst.rate || 18;

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
              value: recognition.vendor.name || 'Vendor Pending',
              confidence: scoreToConfidenceLevel(recognition.vendor.confidence),
              confidenceScore: recognition.vendor.confidence,
              source: 'ai',
            },
            price: {
              value: lineItem.unit_price || 0,
              confidence: scoreToConfidenceLevel(lineItem.confidence_score),
              confidenceScore: lineItem.confidence_score,
              source: 'ai',
            },
            company: {
              value: recognition.company.name || 'PW Materials',
              confidence: scoreToConfidenceLevel(recognition.company.confidence),
              confidenceScore: recognition.company.confidence,
              source: 'ai',
            },
            quantity: {
              value: {
                value: lineItem.quantity || 1,
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
          value: recognition.vendor.name || 'Vendor Pending',
          confidence: scoreToConfidenceLevel(recognition.vendor.confidence),
          confidenceScore: recognition.vendor.confidence,
          source: 'ai',
        },
        price: {
          value: recognition.price.amount || 0,
          confidence: scoreToConfidenceLevel(recognition.price.confidence),
          confidenceScore: recognition.price.confidence,
          source: 'ai',
        },
        company: {
          value: recognition.company.name || 'PW Materials',
          confidence: scoreToConfidenceLevel(recognition.company.confidence),
          confidenceScore: recognition.company.confidence,
          source: 'ai',
        },
        quantity: {
          value: {
            value: recognition.quantity.value || 1,
            unit: recognition.quantity.unit || 'Nos',
          },
          confidence: scoreToConfidenceLevel(recognition.quantity.confidence),
          confidenceScore: recognition.quantity.confidence,
          source: 'ai',
        },
        gst: {
          rate: recognition.gst.rate || 18,
          isGSTInvoice: recognition.gst.isGSTInvoice ?? true,
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

  // Manual material addition - directly inserts into Supabase and refreshes
  const addManualMaterial = useCallback(
    async (itemData: {
      item: string;
      vendor: string;
      price: number;
      company: string;
      qtyValue: number;
      qtyUnit: string;
      gstRate: number;
      isGSTInvoice: boolean;
    }) => {
      const res = await supabaseService.insertMaterial({
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
        return { success: false, error: res.error || 'Failed to save material to Supabase' };
      }

      await refreshMaterials();

      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {
        // Ignore
      }

      return { success: true };
    },
    [refreshMaterials]
  );

  // Update a field inline
  const updateMaterialField = useCallback(
    (
      id: string,
      field: 'item' | 'vendor' | 'price' | 'company' | 'quantity' | 'gst' | 'sku',
      newValue: any
    ) => {
      setDraftMaterials((prev) =>
        prev.map((mat) => {
          if (mat.id !== id) return mat;

          const updated = { ...mat, updatedAt: new Date().toISOString() };

          if (field === 'sku') {
            updated.sku = newValue;
          } else if (field === 'item') {
            updated.item = { value: newValue, confidence: 'high', source: 'manual' };
          } else if (field === 'vendor') {
            updated.vendor = { value: newValue, confidence: 'high', source: 'manual' };
          } else if (field === 'price') {
            updated.price = { value: Number(newValue) || 0, confidence: 'high', source: 'manual' };
          } else if (field === 'company') {
            updated.company = { value: newValue, confidence: 'high', source: 'manual' };
          } else if (field === 'quantity') {
            updated.quantity = {
              value: {
                value: Number(newValue.value) || 1,
                unit: newValue.unit || 'Nos',
              },
              confidence: 'high',
              source: 'manual',
            };
          } else if (field === 'gst') {
            updated.gst = {
              rate: Number(newValue.rate) || 0,
              isGSTInvoice: Boolean(newValue.isGSTInvoice),
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

  const deleteMaterial = useCallback(
    async (id: string) => {
      const isDraft = draftMaterials.some((m) => m.id === id);
      if (isDraft) {
        setDraftMaterials((prev) => prev.filter((m) => m.id !== id));
        return;
      }

      await supabaseService.deletePurchase(id);
      await refreshMaterials();
    },
    [draftMaterials, refreshMaterials]
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
      };
      return [clone, ...prev];
    });
  }, []);

  // Move a material to Purchase History & Supabase (as requested in Handwritten Page 1 & 3)
  const commitToPurchases = useCallback(
    async (materialId: string) => {
      const mat = draftMaterials.find((m) => m.id === materialId);
      if (!mat) return;

      const subTotal = mat.price.value * mat.quantity.value.value;
      const gstAmount = mat.gst.isGSTInvoice ? (subTotal * mat.gst.rate) / 100 : 0;
      const netTotal = subTotal + gstAmount;

      const purchaseRecord: PurchaseRecord = {
        id: `pur-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        item: mat.item.value,
        sku: mat.sku,
        vendor: mat.vendor.value,
        company: mat.company.value,
        quantity: mat.quantity.value.value,
        unit: mat.quantity.value.unit,
        unitPrice: mat.price.value,
        totalPrice: subTotal,
        gstRate: mat.gst.rate,
        gstAmount: gstAmount,
        netAmount: netTotal,
        isGSTInvoice: mat.gst.isGSTInvoice,
        photoUrl: mat.photoUrl,
        aiRecognized: mat.item.source === 'ai',
        confidenceAverage: mat.item.confidenceScore || 0.95,
        createdAt: new Date().toISOString(),
      };

      // Save to Supabase and local purchases
      const res = await supabaseService.addPurchase(purchaseRecord, mat);
      if (!res.success) {
        alert(`Supabase Error: ${res.error || 'Failed to save record'}`);
        return;
      }

      // Remove from draft
      setDraftMaterials((prev) => prev.filter((m) => m.id !== materialId));

      await refreshMaterials();
      onPurchaseAdded?.(purchaseRecord);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Ignore
      }
    },
    [draftMaterials, onPurchaseAdded, refreshMaterials]
  );

  const commitAllToPurchases = useCallback(async () => {
    for (const mat of draftMaterials) {
      await commitToPurchases(mat.id);
    }
  }, [draftMaterials, commitToPurchases]);

  return {
    materials: [...draftMaterials, ...savedMaterials],
    draftMaterials,
    savedMaterials,
    isLoading,
    refreshMaterials,
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
