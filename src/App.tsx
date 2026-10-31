// src/App.tsx
//
// ============================================================
// PW MATERIALS — FOUR-PAGE ROUTED APPLICATION
// ============================================================
// Page 1: /capture   — Dedicated capture, upload, crop & AI recognition
// Page 2: /materials — Dedicated materials list, table & cards
// Page 3: /export    — Dedicated statements export interface
// Page 4: /settings  — Dedicated 6-section configuration & preferences
// ============================================================

import React, { useState } from 'react';
import { Header } from '@/components/Layout/Header';
import { BottomNav } from '@/components/Layout/BottomNav';
import { CapturePage } from '@/pages/CapturePage';
import { MaterialsPage } from '@/pages/MaterialsPage';
import { ExportPage } from '@/pages/ExportPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AddMaterialModal, ReviewItemData, ModalInitialData } from '@/components/MaterialsList/AddMaterialModal';
import { useAIRecognition } from '@/hooks/useAIRecognition';
import { useMaterials } from '@/hooks/useMaterials';
import { useAppRouter } from '@/hooks/useAppRouter';
import { PurchaseRecord, GatewayConfig, SupabaseConfig } from '@/types';
import { gatewayAPI } from '@/services/gatewayAPI';
import { supabaseService } from '@/services/supabaseClient';
import { getPurchases } from '@/services/localDataService';

export const App: React.FC = () => {
  const { currentRoute, navigate } = useAppRouter();

  // Add / Review Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<ModalInitialData | null>(null);

  // Config objects are kept for Settings display & updates
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>(() => gatewayAPI.getConfig());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => supabaseService.getConfig());

  // Purchases managed via localDataService & useMaterials
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => getPurchases());

  // Recognition error state for application-level error panel
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const handlePurchaseAdded = (record: PurchaseRecord) => {
    setPurchases((prev) => [record, ...prev.filter((p) => p.id !== record.id)]);
  };

  const {
    materials,
    confirmMaterials,
    updateMaterialField,
    deleteMaterial,
    duplicateMaterial,
  } = useMaterials(handlePurchaseAdded);

  const {
    recognize,
    isRecognizing,
    progress,
    stage,
    statusMessage,
    elapsedSeconds,
    cancelRecognition,
  } = useAIRecognition();

  // Called when camera photo is snapped or file is uploaded & cropped
  const handlePhotoProcessed = async (imageBase64: string) => {
    setRecognitionError(null);
    try {
      const result = await recognize(imageBase64);
      const isMaterialPhoto = result.documentType === 'material_photo' || !result.documentType;

      // Support multi-line invoice items or single item fallback
      const mappedItems: ReviewItemData[] =
        result.allLineItems && result.allLineItems.length > 0
          ? result.allLineItems.map((li) => ({
              item: li.item_name || li.description || '',
              vendor: isMaterialPhoto ? '' : (result.vendor?.name || ''),
              price: li.unit_price != null ? Number(li.unit_price) : '',
              company: isMaterialPhoto
                ? (result.vendor?.name || '')
                : (result.company?.name || ''),
              qtyValue: li.quantity != null ? Number(li.quantity) : '',
              qtyUnit: li.unit || (isMaterialPhoto ? 'nos' : "no's"),
              gstRate: result.gst?.rate != null ? Number(result.gst.rate) : 18,
              isGSTInvoice: Boolean(result.gst?.isGSTInvoice && result.gst?.rate && Number(result.gst.rate) > 0),
              date: isMaterialPhoto
                ? new Date().toISOString().split('T')[0]
                : (result.invoiceDate || new Date().toISOString().split('T')[0]),
              invoiceNumber: isMaterialPhoto ? '' : (result.invoiceNumber || ''),
              photoUrl: imageBase64,
              confidenceScore: li.confidence_score || 0.95,
            }))
          : [
              {
                item: result.item?.name || '',
                vendor: isMaterialPhoto ? '' : (result.vendor?.name || ''),
                price: result.price?.amount != null ? Number(result.price.amount) : '',
                company: isMaterialPhoto
                  ? (result.vendor?.name || '')
                  : (result.company?.name || ''),
                qtyValue: result.quantity?.value != null ? Number(result.quantity.value) : 1,
                qtyUnit: result.quantity?.unit || (isMaterialPhoto ? 'nos' : "no's"),
                gstRate: result.gst?.rate != null ? Number(result.gst.rate) : 18,
                isGSTInvoice: Boolean(result.gst?.isGSTInvoice && result.gst?.rate && Number(result.gst.rate) > 0),
                date: isMaterialPhoto
                  ? new Date().toISOString().split('T')[0]
                  : (result.invoiceDate || new Date().toISOString().split('T')[0]),
                invoiceNumber: isMaterialPhoto ? '' : (result.invoiceNumber || ''),
                photoUrl: imageBase64,
                confidenceScore: result.item?.confidence || 0.95,
              },
            ];

      // Populate review form ONLY. DO NOT save automatically!
      setModalInitialData({
        items: mappedItems,
        source: 'ai',
        photoUrl: imageBase64,
        documentType: isMaterialPhoto ? 'material_photo' : 'invoice',
      });
      setIsAddModalOpen(true);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('cancelled')) {
        return;
      }
      const safeMsg = err.message || 'Material recognition could not be completed.';
      setRecognitionError(safeMsg);
    }
  };

  const handleOpenManualAdd = () => {
    setModalInitialData(null);
    setIsAddModalOpen(true);
  };

  const handleManualEntryWithPhoto = (photoUrl: string) => {
    setRecognitionError(null);
    setModalInitialData({
      items: [
        {
          item: '',
          vendor: '',
          company: '',
          price: '',
          qtyValue: 1,
          qtyUnit: 'nos',
          gstRate: 18,
          isGSTInvoice: false,
          date: new Date().toISOString().split('T')[0],
          invoiceNumber: '',
          photoUrl: photoUrl,
          confidenceScore: 1.0,
        },
      ],
      source: 'manual',
      photoUrl: photoUrl,
      documentType: 'material_photo',
    });
    setIsAddModalOpen(true);
  };

  const handleModalSubmit = async (items: ReviewItemData[]) => {
    const res = await confirmMaterials(items);
    if (res.success) {
      setPurchases(getPurchases());
      // Navigate user to the Materials page to view newly saved materials
      navigate('/materials');
    }
    return res;
  };

  const handleSaveGatewayConfig = (cfg: Partial<GatewayConfig>) => {
    gatewayAPI.saveConfig(cfg);
    setGatewayConfig(gatewayAPI.getConfig());
  };

  const handleSaveSupabaseConfig = (cfg: Partial<SupabaseConfig>) => {
    supabaseService.saveConfig(cfg);
    setSupabaseConfig(supabaseService.getConfig());
  };

  const allExportableRecords = purchases.length > 0 ? purchases : getPurchases();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Persistent Desktop & Mobile Header with 4-page navigation */}
      <Header
        currentRoute={currentRoute}
        onNavigate={navigate}
        draftCount={isAddModalOpen && modalInitialData?.source === 'ai' ? modalInitialData.items.length : 0}
      />

      {/* Main Content Area: Renders the active dedicated page */}
      <main className="app-container" style={{ flex: 1 }}>
        {currentRoute === '/capture' && (
          <CapturePage
            onPhotoProcessed={handlePhotoProcessed}
            isProcessing={isRecognizing}
            processingProgress={progress}
            processingStage={stage}
            processingStatusMessage={statusMessage}
            processingElapsedSeconds={elapsedSeconds}
            onCancelProcessing={cancelRecognition}
            recognitionError={recognitionError}
            onClearError={() => setRecognitionError(null)}
            onManualEntryWithPhoto={handleManualEntryWithPhoto}
          />
        )}

        {currentRoute === '/materials' && (
          <MaterialsPage
            materials={materials}
            onDelete={deleteMaterial}
            onDuplicate={duplicateMaterial}
            onUpdateField={updateMaterialField}
            onOpenAdd={handleOpenManualAdd}
          />
        )}

        {currentRoute === '/export' && (
          <ExportPage purchases={allExportableRecords} />
        )}

        {currentRoute === '/settings' && (
          <SettingsPage
            gatewayConfig={gatewayConfig}
            onSaveGatewayConfig={handleSaveGatewayConfig}
            supabaseConfig={supabaseConfig}
            onSaveSupabaseConfig={handleSaveSupabaseConfig}
            savedMaterialsCount={materials.length}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation on Mobile Devices with 4 dedicated buttons */}
      <BottomNav
        currentRoute={currentRoute}
        onNavigate={navigate}
        draftCount={isAddModalOpen && modalInitialData?.source === 'ai' ? modalInitialData.items.length : 0}
      />

      {/* Review & Manual Entry Modal */}
      <AddMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalInitialData(null);
        }}
        onAdd={handleModalSubmit}
        initialData={modalInitialData}
      />
    </div>
  );
};
