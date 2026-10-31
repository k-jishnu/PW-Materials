// src/App.tsx
//
// ============================================================
// PW MATERIALS — COMPLETE AUTHENTICATION & USER MANAGEMENT
// ============================================================
// - Auth Routes: /login, /signup, /forgot-password, /reset-password,
//                /pending-approval, /access-denied, /auth/callback
// - Four Core Pages: /capture, /materials, /export, /settings
// - Admin Route: /admin/users (Root Admin & Admin only)
// - Approval Workflow: Pending users are strictly restricted to /pending-approval
// ============================================================

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Layout/Header';
import { BottomNav } from '@/components/Layout/BottomNav';
import { CapturePage } from '@/pages/CapturePage';
import { MaterialsPage } from '@/pages/MaterialsPage';
import { ExportPage } from '@/pages/ExportPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { PendingApprovalPage } from '@/pages/PendingApprovalPage';
import { AccessDeniedPage } from '@/pages/AccessDeniedPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { AddMaterialModal, ReviewItemData, ModalInitialData } from '@/components/MaterialsList/AddMaterialModal';
import { useAIRecognition } from '@/hooks/useAIRecognition';
import { useMaterials } from '@/hooks/useMaterials';
import { useAppRouter, AppRoute } from '@/hooks/useAppRouter';
import { useAuthProvider, AuthContext } from '@/hooks/useAuth';
import { PurchaseRecord, GatewayConfig, SupabaseConfig } from '@/types';
import { gatewayAPI } from '@/services/gatewayAPI';
import { supabaseService } from '@/services/supabaseClient';
import { getPurchases } from '@/services/localDataService';
import { RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const authState = useAuthProvider();
  const {
    user,
    profile,
    approvalStatus,
    isLoading: authLoading,
    isAuthenticated,
    isApproved,
    isAdmin,
  } = authState;

  const { currentRoute, navigate } = useAppRouter();

  // Add / Review Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState<ModalInitialData | null>(null);

  // Config objects
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig>(() => gatewayAPI.getConfig());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => supabaseService.getConfig());

  // Purchases managed via localDataService & useMaterials
  const [purchases, setPurchases] = useState<PurchaseRecord[]>(() => getPurchases());

  // Recognition error state
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

  // ==========================================================================
  // ROUTE PROTECTION & REDIRECT LOGIC
  // ==========================================================================
  const isAuthRoute =
    currentRoute === '/login' ||
    currentRoute === '/signup' ||
    currentRoute === '/forgot-password' ||
    currentRoute === '/reset-password' ||
    currentRoute === '/auth/callback';

  useEffect(() => {
    if (authLoading) return;

    // Check if Supabase client is connected; if not configured with keys, allow local evaluation
    const hasSupabaseClient = !!supabaseService.getClient();

    if (!hasSupabaseClient) {
      // Local fallback mode when no Supabase URL/Key is configured
      return;
    }

    if (!isAuthenticated) {
      // User is not logged in
      if (!isAuthRoute) {
        navigate('/login');
      }
    } else {
      // User is logged in
      if (approvalStatus === 'PENDING') {
        if (currentRoute !== '/pending-approval') {
          navigate('/pending-approval');
        }
      } else if (approvalStatus === 'REJECTED') {
        if (currentRoute !== '/access-denied') {
          navigate('/access-denied');
        }
      } else if (approvalStatus === 'SUSPENDED') {
        if (currentRoute !== '/access-denied') {
          navigate('/access-denied');
        }
      } else if (isApproved) {
        // User is approved: if they are on an auth route or pending screen, redirect to /capture
        if (
          isAuthRoute ||
          currentRoute === '/pending-approval' ||
          currentRoute === '/access-denied'
        ) {
          navigate('/capture');
        } else if (currentRoute === '/admin/users' && !isAdmin) {
          // Non-admin trying to access admin page
          navigate('/capture');
        }
      }
    }
  }, [
    authLoading,
    isAuthenticated,
    isApproved,
    approvalStatus,
    currentRoute,
    isAuthRoute,
    isAdmin,
    navigate,
  ]);

  // Loading Screen while initial session and profile are validating
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-page)',
          gap: '12px',
        }}
      >
        <RefreshCw size={28} className="spin" color="var(--color-primary)" />
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Authenticating PW Materials...
        </span>
      </div>
    );
  }

  // Standalone Auth Screens (No Header / No Bottom Nav)
  if (currentRoute === '/login') {
    return (
      <AuthContext.Provider value={authState}>
        <LoginPage onNavigate={navigate} onSuccess={() => navigate('/capture')} />
      </AuthContext.Provider>
    );
  }

  if (currentRoute === '/signup') {
    return (
      <AuthContext.Provider value={authState}>
        <SignupPage onNavigate={navigate} onSuccess={() => navigate('/pending-approval')} />
      </AuthContext.Provider>
    );
  }

  if (currentRoute === '/forgot-password') {
    return (
      <AuthContext.Provider value={authState}>
        <ForgotPasswordPage onNavigate={navigate} />
      </AuthContext.Provider>
    );
  }

  if (currentRoute === '/reset-password') {
    return (
      <AuthContext.Provider value={authState}>
        <ResetPasswordPage onNavigate={navigate} />
      </AuthContext.Provider>
    );
  }

  if (currentRoute === '/pending-approval') {
    return (
      <AuthContext.Provider value={authState}>
        <PendingApprovalPage onNavigate={navigate} />
      </AuthContext.Provider>
    );
  }

  if (currentRoute === '/access-denied') {
    return (
      <AuthContext.Provider value={authState}>
        <AccessDeniedPage onNavigate={navigate} />
      </AuthContext.Provider>
    );
  }

  if (currentRoute === '/auth/callback') {
    return (
      <AuthContext.Provider value={authState}>
        <AuthCallbackPage onNavigate={navigate} />
      </AuthContext.Provider>
    );
  }

  // ==========================================================================
  // CORE APPLICATION SCREENS (Protected & Approved)
  // ==========================================================================

  const handlePhotoProcessed = async (imageBase64: string) => {
    setRecognitionError(null);
    try {
      const result = await recognize(imageBase64);
      const isMaterialPhoto = result.documentType === 'material_photo' || !result.documentType;

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
    <AuthContext.Provider value={authState}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header
          currentRoute={currentRoute}
          onNavigate={navigate}
          draftCount={isAddModalOpen && modalInitialData?.source === 'ai' ? modalInitialData.items.length : 0}
        />

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

          {currentRoute === '/admin/users' && isAdmin && (
            <AdminUsersPage />
          )}
        </main>

        <BottomNav
          currentRoute={currentRoute}
          onNavigate={navigate}
          draftCount={isAddModalOpen && modalInitialData?.source === 'ai' ? modalInitialData.items.length : 0}
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
      </div>
    </AuthContext.Provider>
  );
};
