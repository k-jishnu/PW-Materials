// src/App.tsx
import React, { useState, useEffect, useRef } from 'react';
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

  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>(() => gatewayAPI.getConfig());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => supabaseService.getConfig());
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);

  // Purge any legacy dummy items from localStorage and load real purchases
  useEffect(() => {
    try {
      const local = localStorage.getItem('pw_materials_local_purchases');
      if (local) {
        const parsed: PurchaseRecord[] = JSON.parse(local);
        const clean = parsed.filter((r) => !r.id.startsWith('pur-10'));
        if (clean.length !== parsed.length) {
          localStorage.setItem('pw_materials_local_purchases', JSON.stringify(clean));
        }
      }
    } catch {
      // Ignore
    }

    supabaseService.getPurchases().then((records) => {
      setPurchases(records);
    });
  }, []);

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

  // References for scrolling into view on tab switch
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

  // Triggered when user snaps photo or uploads bill
  const handlePhotoProcessed = async (imageBase64: string) => {
    try {
      const result = await recognize(imageBase64);
      addMaterialFromRecognition(result, imageBase64);

      // Smooth scroll down to materials section
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

  // All exportable records (saved purchases + current materials)
  const allExportableRecords: PurchaseRecord[] = [
    ...purchases,
    ...draftMaterials.map((mat) => {
      const priceVal = mat.price.value ?? 0;
      const qtyVal = mat.quantity.value.value ?? 1;
      const gstRateVal = mat.gst.rate ?? 0;
      const subTotal = priceVal * qtyVal;
      const gstAmount = mat.gst.isGSTInvoice && mat.gst.rate !== null ? (subTotal * gstRateVal) / 100 : 0;
      return {
        id: mat.id,
        date: mat.createdAt ? mat.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        item: mat.item.value,
        sku: mat.sku,
        vendor: mat.vendor.value || 'Unknown Vendor',
        company: mat.company.value || 'PW',
        quantity: qtyVal,
        unit: mat.quantity.value.unit,
        unitPrice: priceVal,
        totalPrice: subTotal,
        gstRate: gstRateVal,
        gstAmount: gstAmount,
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
      {/* Sticky Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        supabaseConfig={supabaseConfig}
        gatewayConfig={gatewayConfig}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        draftCount={draftMaterials.length}
      />

      {/* Main Content Area */}
      <main className="app-container">
        {/* 1. Photo Capture Section (Hero Blue Gradient Card) */}
        <div ref={captureSectionRef} id="section-capture" style={{ scrollMarginTop: '80px' }}>
          <PhotoCapture
            onPhotoProcessed={handlePhotoProcessed}
            isProcessing={isRecognizing}
            processingProgress={progress}
          />
        </div>

        {/* 2. Materials List & Inline Table Section */}
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

        {/* 3. Download Statement Section (Yellow Gradient Card) */}
        <div ref={downloadSectionRef} id="section-download" style={{ scrollMarginTop: '80px' }}>
          <DownloadSection purchases={allExportableRecords} />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        draftCount={draftMaterials.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Configuration Settings Modal */}
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
