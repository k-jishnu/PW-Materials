// src/App.tsx
//
// ============================================================
// PHASE 2 FIX: AI Recognition populates Review Modal ONLY.
// Materials list contains ONLY confirmed and saved records.
// No unreviewed AI results are ever auto-added to Materials.
// ============================================================

import React, { useState, useRef } from 'react';
import { Header } from '@/components/Layout/Header';
import { BottomNav, ActiveTab } from '@/components/Layout/BottomNav';
import { PhotoCapture } from '@/components/PhotoSection/PhotoCapture';
import { MaterialsTable } from '@/components/MaterialsList/MaterialsTable';
import { DownloadSection } from '@/components/DownloadSection/DownloadSection';
import { SettingsModal } from '@/components/Settings/SettingsModal';
import { AddMaterialModal, ReviewItemData, ModalInitialData } from '@/components/MaterialsList/AddMaterialModal';
import { useAIRecognition } from '@/hooks/useAIRecognition';
import { useMaterials } from '@/hooks/useMaterials';
import { PurchaseRecord, GatewayConfig, SupabaseConfig } from '@/types';
import { gatewayAPI } from '@/services/gatewayAPI';
import { supabaseService } from '@/services/supabaseClient';
import { getPurchases } from '@/services/localDataService';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('capture');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Add / Review Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<ModalInitialData | null>(null);

  // Config objects are kept for Settings modal display only
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>(() => gatewayAPI.getConfig());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => supabaseService.getConfig());

  // Purchases are managed entirely via useMaterials -> localDataService
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => getPurchases());

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

  const captureSectionRef = useRef<HTMLDivElement>(null);
  const materialsSectionRef = useRef<HTMLDivElement>(null);
  const downloadSectionRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const refMap: Record<ActiveTab, React.RefObject<HTMLDivElement | null>> = {
      capture: captureSectionRef,
      materials: materialsSectionRef,
      download: downloadSectionRef,
    };
    refMap[tab]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Called when camera photo is snapped or file is uploaded
  const handlePhotoProcessed = async (imageBase64: string) => {
    try {
      const result = await recognize(imageBase64);
      const isMaterialPhoto = result.documentType === 'material_photo' || !result.documentType;

      // Support multi-line invoice items or single item fallback
      const mappedItems: ReviewItemData[] =
        result.allLineItems && result.allLineItems.length > 0
          ? result.allLineItems.map((li) => ({
              item: li.item_name || li.description || '',
              // For material photos: vendor = blank (user enters supplier manually)
              // For invoices: vendor = supplier name from invoice
              vendor: isMaterialPhoto ? '' : (result.vendor?.name || ''),
              price: li.unit_price != null ? Number(li.unit_price) : '',
              // For material photos: company = product brand/manufacturer from AI
              // For invoices: company = company_ref from invoice
              company: isMaterialPhoto
                ? (result.vendor?.name || '')  // brand/manufacturer goes to company field
                : (result.company?.name || ''),
              qtyValue: li.quantity != null ? Number(li.quantity) : '',
              qtyUnit: li.unit || (isMaterialPhoto ? 'nos' : "no's"),
              gstRate: result.gst?.rate != null ? Number(result.gst.rate) : 18,
              isGSTInvoice: Boolean(result.gst?.isGSTInvoice && result.gst?.rate && Number(result.gst.rate) > 0),
              date: isMaterialPhoto
                ? new Date().toISOString().split('T')[0]  // use today for material photos (capture date)
                : (result.invoiceDate || new Date().toISOString().split('T')[0]),
              invoiceNumber: isMaterialPhoto ? '' : (result.invoiceNumber || ''),
              photoUrl: imageBase64,
              confidenceScore: li.confidence_score || 0.95,
            }))
          : [
              {
                item: result.item?.name || '',
                // For material photos: vendor stays blank (user must enter supplier manually)
                vendor: isMaterialPhoto ? '' : (result.vendor?.name || ''),
                price: result.price?.amount != null ? Number(result.price.amount) : '',
                // For material photos: company = product brand/manufacturer identified from image
                company: isMaterialPhoto
                  ? (result.vendor?.name || '')  // brand/manufacturer goes to company field
                  : (result.company?.name || ''),
                qtyValue: result.quantity?.value != null ? Number(result.quantity.value) : 1,
                qtyUnit: result.quantity?.unit || (isMaterialPhoto ? 'nos' : "no's"),
                gstRate: result.gst?.rate != null ? Number(result.gst.rate) : 18,
                isGSTInvoice: Boolean(result.gst?.isGSTInvoice && result.gst?.rate && Number(result.gst.rate) > 0),
                date: isMaterialPhoto
                  ? new Date().toISOString().split('T')[0]  // use today for material photos (capture date)
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
        return; // User cancelled extraction or superseded
      }
      alert(`AI Recognition Error: ${err.message || 'Failed to process image'}`);
    }
  };

  const handleOpenManualAdd = () => {
    setModalInitialData(null);
    setIsAddModalOpen(true);
  };

  const handleModalSubmit = async (items: ReviewItemData[]) => {
    const res = await confirmMaterials(items);
    if (res.success) {
      // Refresh local purchases state
      setPurchases(getPurchases());
      setTimeout(() => {
        materialsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
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

  // All exportable records are confirmed records from localDataService
  const allExportableRecords = purchases.length > 0 ? purchases : getPurchases();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        supabaseConfig={supabaseConfig}
        gatewayConfig={gatewayConfig}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        draftCount={isAddModalOpen && modalInitialData?.source === 'ai' ? modalInitialData.items.length : 0}
      />

      <main className="app-container">
        <div ref={captureSectionRef} id="section-capture" style={{ scrollMarginTop: '80px' }}>
          <PhotoCapture
            onPhotoProcessed={handlePhotoProcessed}
            isProcessing={isRecognizing}
            processingProgress={progress}
            processingStage={stage}
            processingStatusMessage={statusMessage}
            processingElapsedSeconds={elapsedSeconds}
            onCancelProcessing={cancelRecognition}
          />
        </div>

        <div ref={materialsSectionRef} id="section-materials" style={{ scrollMarginTop: '80px' }}>
          <MaterialsTable
            materials={materials}
            onDelete={deleteMaterial}
            onDuplicate={duplicateMaterial}
            onUpdateField={updateMaterialField}
            onOpenAdd={handleOpenManualAdd}
          />
        </div>

        <div ref={downloadSectionRef} id="section-download" style={{ scrollMarginTop: '80px' }}>
          <DownloadSection purchases={allExportableRecords} />
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        draftCount={isAddModalOpen && modalInitialData?.source === 'ai' ? modalInitialData.items.length : 0}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <AddMaterialModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalInitialData(null);
        }}
        onAdd={handleModalSubmit}
        initialData={modalInitialData}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gatewayConfig={gatewayConfig}
        onSaveGatewayConfig={handleSaveGatewayConfig}
        supabaseConfig={supabaseConfig}
        onSaveSupabaseConfig={handleSaveSupabaseConfig}
      />
    </div>
  );
};
