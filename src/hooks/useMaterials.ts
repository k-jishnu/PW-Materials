// src/hooks/useMaterials.ts
import { useState, useCallback, useEffect } from 'react';
import { Material, MaterialRecognitionResult, PurchaseRecord } from '@/types';
import { scoreToConfidenceLevel } from './useAIRecognition';
import { supabaseService } from '@/services/supabaseClient';
import confetti from 'canvas-confetti';

export const useMaterials = (onPurchaseAdded?: (record: PurchaseRecord) => void) => {
  const [draftMaterials, setDraftMaterials] = useState<Material[]>(() => {
    return supabaseService.getDraftMaterials();
  });

  // Keep draft materials synced to local storage
  useEffect(() => {
    supabaseService.saveDraftMaterials(draftMaterials);
  }, [draftMaterials]);

  // Autofill material from AI recognition result (as defined in Part 5.1 of PDF spec)
  const addMaterialFromRecognition = useCallback(
    (recognition: MaterialRecognitionResult, photoUrl?: string) => {
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
        photoUrl: photoUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
      };

      setDraftMaterials((prev) => [newMaterial, ...prev]);
      return newMaterial;
    },
    []
  );

  // Manual material addition
  const addManualMaterial = useCallback((itemData: {
    item: string;
    vendor: string;
    price: number;
    company: string;
    qtyValue: number;
    qtyUnit: string;
    gstRate: number;
    isGSTInvoice: boolean;
  }) => {
    const generatedSKU = `MAN-${Date.now().toString().slice(-6)}`;
    const newMaterial: Material = {
      id: `mat-${Date.now()}`,
      sku: generatedSKU,
      item: { value: itemData.item, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
      vendor: { value: itemData.vendor, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
      price: { value: itemData.price, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
      company: { value: itemData.company, confidence: 'high', confidenceScore: 1.0, source: 'manual' },
      quantity: {
        value: { value: itemData.qtyValue, unit: itemData.qtyUnit },
        confidence: 'high',
        confidenceScore: 1.0,
        source: 'manual',
      },
      gst: {
        rate: itemData.gstRate,
        isGSTInvoice: itemData.isGSTInvoice,
        confidence: 'high',
        confidenceScore: 1.0,
        source: 'manual',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
    };

    setDraftMaterials((prev) => [newMaterial, ...prev]);
  }, []);

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

  const deleteMaterial = useCallback((id: string) => {
    setDraftMaterials((prev) => prev.filter((m) => m.id !== id));
  }, []);

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

      // Remove from draft
      setDraftMaterials((prev) => prev.filter((m) => m.id !== materialId));

      // Save to Supabase and local purchases
      await supabaseService.addPurchase(purchaseRecord);
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
    [draftMaterials, onPurchaseAdded]
  );

  const commitAllToPurchases = useCallback(async () => {
    for (const mat of draftMaterials) {
      await commitToPurchases(mat.id);
    }
  }, [draftMaterials, commitToPurchases]);

  return {
    draftMaterials,
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
