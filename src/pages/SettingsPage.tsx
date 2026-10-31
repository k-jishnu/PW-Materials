// src/pages/SettingsPage.tsx
//
// Page 4: Settings
// Dedicated settings page organized into 7 logical sections:
// 1. Account and Profile
// 2. User Management (Admin & Root Admin Only)
// 3. Application Preferences
// 4. Data and Synchronization
// 5. AI Recognition Settings
// 6. Camera and Upload Preferences
// 7. About PW Materials
//

import React, { useState } from 'react';
import {
  User,
  Sliders,
  Database,
  Sparkles,
  Camera,
  Info,
  CheckCircle2,
  HardDrive,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { GatewayConfig, SupabaseConfig } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { AdminUsersPage } from '@/pages/AdminUsersPage';

interface SettingsPageProps {
  gatewayConfig: GatewayConfig;
  onSaveGatewayConfig: (cfg: Partial<GatewayConfig>) => void;
  supabaseConfig: SupabaseConfig;
  onSaveSupabaseConfig: (cfg: Partial<SupabaseConfig>) => void;
  savedMaterialsCount: number;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  gatewayConfig,
  onSaveGatewayConfig,
  supabaseConfig,
  onSaveSupabaseConfig,
  savedMaterialsCount,
}) => {
  const { user, profile, isAdmin, isRootAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<
    'account' | 'users' | 'preferences' | 'data' | 'ai' | 'camera' | 'about'
  >('account');

  // Application preferences state
  const [defaultCurrency, setDefaultCurrency] = useState<string>('INR (₹)');
  const [defaultUnit, setDefaultUnit] = useState<string>('nos');
  const [defaultGSTRate, setDefaultGSTRate] = useState<number>(18);
  const [isSavedBanner, setIsSavedBanner] = useState<boolean>(false);

  // Camera preferences
  const [cameraPreference, setCameraPreference] = useState<'native' | 'webcam'>('native');
  const [enableCropper, setEnableCropper] = useState<boolean>(true);

  const handleSavePreferences = () => {
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Page Header */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
          Settings & Configuration
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          Manage your account profile, preferences, synchronization, user approvals, and AI parameters.
        </p>
      </div>

      {/* Success Banner */}
      {isSavedBanner && (
        <div
          style={{
            background: 'var(--color-success)',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-hard-xs)',
          }}
        >
          <CheckCircle2 size={16} strokeWidth={2.5} />
          <span>Preferences saved successfully!</span>
        </div>
      )}

      {/* Settings Grid: Left Category Navigation + Right Detail Panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* Left Nav Pills */}
        <div
          className="card"
          style={{
            background: 'var(--bg-surface)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveSubTab('account')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeSubTab === 'account' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeSubTab === 'account' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: activeSubTab === 'account' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            <User size={17} strokeWidth={2.2} />
            <span>Account & Profile</span>
          </button>

          {/* Admin User Management Sub-Tab */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveSubTab('users')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: activeSubTab === 'users' ? '2px solid var(--color-border)' : '2px solid transparent',
                background: activeSubTab === 'users' ? '#FEF3C7' : 'transparent',
                boxShadow: activeSubTab === 'users' ? 'var(--shadow-hard-xs)' : 'none',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                textAlign: 'left',
              }}
            >
              <Users size={17} strokeWidth={2.2} color="#D97706" />
              <span>User Approvals</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveSubTab('preferences')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeSubTab === 'preferences' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeSubTab === 'preferences' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: activeSubTab === 'preferences' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            <Sliders size={17} strokeWidth={2.2} />
            <span>Application Preferences</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('data')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeSubTab === 'data' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeSubTab === 'data' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: activeSubTab === 'data' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            <Database size={17} strokeWidth={2.2} />
            <span>Data & Synchronization</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ai')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeSubTab === 'ai' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeSubTab === 'ai' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: activeSubTab === 'ai' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            <Sparkles size={17} strokeWidth={2.2} />
            <span>AI Recognition Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('camera')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeSubTab === 'camera' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeSubTab === 'camera' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: activeSubTab === 'camera' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            <Camera size={17} strokeWidth={2.2} />
            <span>Camera & Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('about')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeSubTab === 'about' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeSubTab === 'about' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: activeSubTab === 'about' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            <Info size={17} strokeWidth={2.2} />
            <span>About PW Materials</span>
          </button>
        </div>

        {/* Right Content Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 1. Account & Profile */}
          {activeSubTab === 'account' && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-logo-bg)',
                    border: '2px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <User size={24} strokeWidth={2.2} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, fontFamily: 'var(--font-serif)' }}>
                    {profile?.full_name || 'Project User'}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {user?.email || profile?.email || 'N/A'} &bull; Role: <strong>{profile?.role || 'VIEWER'}</strong>
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '13px',
                }}
              >
                <div><strong>Mobile Number:</strong> {profile?.mobile_number || 'Not provided'}</div>
                <div><strong>Assigned Role:</strong> {profile?.role || 'VIEWER'}</div>
                <div><strong>Account Status:</strong> {profile?.approval_status || 'PENDING'}</div>
                <div><strong>Authentication Method:</strong> {profile?.auth_provider || profile?.registration_method || 'email'}</div>
              </div>
            </div>
          )}

          {/* 2. Admin User Management Section inside Settings */}
          {activeSubTab === 'users' && isAdmin && (
            <AdminUsersPage />
          )}

          {/* 3. Application Preferences */}
          {activeSubTab === 'preferences' && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, fontFamily: 'var(--font-serif)' }}>
                Application Preferences
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                    Default Currency
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--color-border)',
                      fontFamily: 'inherit',
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                    <option value="USD ($)">USD ($) - US Dollar</option>
                    <option value="EUR (€)">EUR (€) - Euro</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                    Default Measurement Unit
                  </label>
                  <select
                    value={defaultUnit}
                    onChange={(e) => setDefaultUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--color-border)',
                      fontFamily: 'inherit',
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="nos">nos (pieces / items)</option>
                    <option value="kg">kg (kilograms)</option>
                    <option value="bags">bags (cement / sand)</option>
                    <option value="meters">meters</option>
                    <option value="sqft">sqft</option>
                    <option value="liters">liters</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                    Standard GST Rate (%)
                  </label>
                  <select
                    value={defaultGSTRate}
                    onChange={(e) => setDefaultGSTRate(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--color-border)',
                      fontFamily: 'inherit',
                      background: '#FFFFFF',
                    }}
                  >
                    <option value={18}>18% (Standard Materials)</option>
                    <option value={12}>12% (Construction Supplies)</option>
                    <option value={28}>28% (Luxury / Heavy Cement)</option>
                    <option value={5}>5% (Essential Goods)</option>
                    <option value={0}>0% (Tax Exempt)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', height: '38px', padding: '0 18px', marginTop: '6px' }}
                >
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* 4. Data & Synchronization */}
          {activeSubTab === 'data' && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, fontFamily: 'var(--font-serif)' }}>
                Data & Storage Status
              </h3>

              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <HardDrive size={24} color="var(--text-primary)" />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>
                    {savedMaterialsCount} Material Records Saved
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Stored with offline IndexedDB & Local Storage persistence
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                All purchases, receipts, and material cards are automatically indexed and backed up locally.
                Supabase database integration is available for multi-device team synchronization.
              </div>
            </div>
          )}

          {/* 5. AI Recognition Settings */}
          {activeSubTab === 'ai' && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, fontFamily: 'var(--font-serif)' }}>
                AI Recognition Engine
              </h3>

              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#16A34A" />
                  <strong>Self-Contained Serverless Engine:</strong> Active
                </div>
                <div><strong>Primary Model:</strong> Google Gemini 2.5 Flash</div>
                <div><strong>Failover Fallbacks:</strong> Gemini 2.5 Flash-Lite, Gemini 1.5 Flash</div>
                <div><strong>Monotonic Progress:</strong> Enabled (Real-time HTTP streaming)</div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                The AI engine parses material labels, brands, quantities, and GST rates directly on production without exposing API credentials.
              </p>
            </div>
          )}

          {/* 6. Camera & Upload Preferences */}
          {activeSubTab === 'camera' && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, fontFamily: 'var(--font-serif)' }}>
                Camera & Upload Preferences
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px' }}>
                    Camera Trigger Behavior
                  </label>
                  <select
                    value={cameraPreference}
                    onChange={(e) => setCameraPreference(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--color-border)',
                      fontFamily: 'inherit',
                      background: '#FFFFFF',
                    }}
                  >
                    <option value="native">Native Mobile Camera (Recommended for phone browsers)</option>
                    <option value="webcam">Browser Webcam Stream (Best for laptops / desktop)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="chk-cropper"
                    checked={enableCropper}
                    onChange={(e) => setEnableCropper(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chk-cropper" style={{ fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Enable interactive cropping & rotation before AI extraction
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', height: '38px', padding: '0 18px', marginTop: '6px' }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* 7. About PW Materials */}
          {activeSubTab === 'about' && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-logo-bg)',
                    border: '2.5px solid var(--color-border)',
                    boxShadow: 'var(--shadow-hard-xs)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#202020" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z" />
                    <path d="M21 7v10" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, fontFamily: 'var(--font-serif)' }}>
                    PW Materials
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Version 2.5.0 &bull; Production Release
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-card)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              >
                PW Materials streamlines construction material tracking, receipt extraction, and project cost auditing with intelligent AI recognition and multi-format exports.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
