// src/App.tsx
//
// PHASE 1: Supabase config still kept for Settings modal display,
// but NO active reads/writes happen from App. All data flows
// through useMaterials -> localDataService.

import React, { useState, useRef } from 'react';
import { Header } from '@/components/Layout/Header';
import { BottomNav, ActiveTab } from '@/components/Layout/BottomNav';
import { PhotoCapture } from '@/components/PhotoSection/PhotoCapture';
import { MaterialsTable } from '@/components/MaterialsList/MaterialsTable';
import { DownloadSection } from '@/components/DownloadSection/DownloadSection';
import { SettingsModal } from '@/components/Settings/SettingsModal';
import { useAIRecognition } from '@/hooks/useAIRecognition';
import { useMaterials } from '@/hooks/useMaterials';
import { PurchaseRecord, GatewayConfig, SupabaseConfig } from '@/types';
import { gatewayAPI } from '@/services/gatewayAPI';
import { supabaseService } from '@/services/supabaseClient';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('capture');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Config objects are kept for Settings modal display only
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>(() => gatewayAPI.getConfig());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => supabaseService.getConfig());

  // Purchases are managed entirely via useMaterials -> localDataService
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  const handlePurchaseAdded = (record: PurchaseRecord) => {
    setPurchases((prev) => [record, ...prev]);
  };

  const {
    materials,
    draftMaterials,
    addMaterialFromRecognition,
    addManualMaterial,
    updateMaterialField,
    deleteMaterial,
    duplicateMaterial,
    commitToPurchases,
    commitAllToPurchases,
  } = useMaterials(handlePurchaseAdded);

  const { recognize, isRecognizing, progress } = useAIRecognition();

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

  const handlePhotoProcessed = async (imageBase64: string) => {
    try {
      const result = await recognize(imageBase64);
      addMaterialFromRecognition(result, imageBase64);
      setTimeout(() => {
        materialsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err: any) {
      alert(`AI Recognition Error: ${err.message || 'Failed to process image'}`);
    }
  };

  const handleSaveGatewayConfig = (cfg: Partial<GatewayConfig>) => {
    gatewayAPI.saveConfig(cfg);
    setGatewayConfig(gatewayAPI.getConfig());
  };

  const handleSaveSupabaseConfig = (cfg: Partial<SupabaseConfig>) => {
    supabaseService.saveConfig(cfg);
    setSupabaseConfig(supabaseService.getConfig());
  };

  // All exportable records: saved purchases from local storage + current drafts
  const allExportableRecords: PurchaseRecord[] = [
    ...purchases,
    ...draftMaterials.map((mat) => {
      const priceVal = mat.price.value ?? 0;
      const qtyVal = mat.quantity.value.value ?? 1;
      const gstRateVal = mat.gst.rate ?? 0;
      const subTotal = priceVal * qtyVal;
      const gstAmount =
        mat.gst.isGSTInvoice && mat.gst.rate !== null ? (subTotal * gstRateVal) / 100 : 0;
      return {
        id: mat.id,
        date: mat.invoiceDate || (mat.createdAt ? mat.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
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
        netAmount: subTotal + gstAmount,
        isGSTInvoice: mat.gst.isGSTInvoice && mat.gst.rate !== null && mat.gst.rate > 0,
        photoUrl: mat.photoUrl,
        aiRecognized: mat.item.source === 'ai',
        confidenceAverage: mat.item.confidenceScore || 0.95,
        createdAt: mat.createdAt,
      };
    }),
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        supabaseConfig={supabaseConfig}
        gatewayConfig={gatewayConfig}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        draftCount={draftMaterials.length}
      />

      <main className="app-container">
        <div ref={captureSectionRef} id="section-capture" style={{ scrollMarginTop: '80px' }}>
          <PhotoCapture
            onPhotoProcessed={handlePhotoProcessed}
            isProcessing={isRecognizing}
            processingProgress={progress}
          />
        </div>

        <div ref={materialsSectionRef} id="section-materials" style={{ scrollMarginTop: '80px' }}>
          <MaterialsTable
            materials={materials}
            onCommit={commitToPurchases}
            onCommitAll={commitAllToPurchases}
            onDelete={deleteMaterial}
            onDuplicate={duplicateMaterial}
            onUpdateField={updateMaterialField}
            onAddManual={addManualMaterial}
          />
        </div>

        <div ref={downloadSectionRef} id="section-download" style={{ scrollMarginTop: '80px' }}>
          <DownloadSection purchases={allExportableRecords} />
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        draftCount={draftMaterials.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
