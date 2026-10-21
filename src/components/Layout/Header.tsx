// src/components/Layout/Header.tsx
import React from 'react';
import { Settings, Camera, Package, DownloadCloud, Database, Cloud } from 'lucide-react';
import { SupabaseConfig, GatewayConfig } from '@/types';
import { ActiveTab } from './BottomNav';

interface HeaderProps {
  onOpenSettings: () => void;
  supabaseConfig: SupabaseConfig;
  gatewayConfig: GatewayConfig;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  draftCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  supabaseConfig,
  activeTab,
  onTabChange,
  draftCount,
}) => {
  return (
    <header className="app-header">
      <div style={{
        maxWidth: '1140px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '16px',
      }}>
        {/* Brand / Logo: Light Yellow #FFF0BC background, bold black border, hard offset shadow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-logo-bg)',
            border: '2.5px solid var(--color-border)',
            boxShadow: 'var(--shadow-hard-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#202020',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#202020" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z" />
              <path d="M21 7v10" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', letterSpacing: '-0.02em' }}>
              PW Materials
            </span>
          </div>
        </div>

        {/* Desktop Primary Navigation */}
        <nav
          className="desktop-nav"
          style={{
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-surface)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--color-border)',
            boxShadow: 'var(--shadow-hard-xs)',
          }}
          aria-label="Main Navigation"
        >
          <button
            type="button"
            onClick={() => onTabChange('capture')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              color: '#202020',
              backgroundColor: activeTab === 'capture' ? 'var(--color-primary-selected)' : 'transparent',
              border: activeTab === 'capture' ? '2px solid var(--color-border)' : '2px solid transparent',
              cursor: 'pointer',
              boxShadow: activeTab === 'capture' ? 'var(--shadow-hard-xs)' : 'none',
              transition: 'all 0.1s ease',
            }}
          >
            <Camera size={15} strokeWidth={2.5} />
            <span>Capture</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('materials')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              color: '#202020',
              backgroundColor: activeTab === 'materials' ? 'var(--color-primary-selected)' : 'transparent',
              border: activeTab === 'materials' ? '2px solid var(--color-border)' : '2px solid transparent',
              cursor: 'pointer',
              boxShadow: activeTab === 'materials' ? 'var(--shadow-hard-xs)' : 'none',
              transition: 'all 0.1s ease',
            }}
          >
            <Package size={15} strokeWidth={2.5} />
            <span>Materials</span>
            {draftCount > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 900,
                backgroundColor: 'var(--color-butter-yellow)',
                color: '#202020',
                padding: '1px 6px',
                borderRadius: 'var(--radius-pill)',
                border: '1.5px solid var(--color-border)',
                lineHeight: '16px',
              }}>
                {draftCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('download')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontFamily: 'var(--font-serif)',
              fontWeight: 700,
              color: '#202020',
              backgroundColor: activeTab === 'download' ? 'var(--color-primary-selected)' : 'transparent',
              border: activeTab === 'download' ? '2px solid var(--color-border)' : '2px solid transparent',
              cursor: 'pointer',
              boxShadow: activeTab === 'download' ? 'var(--shadow-hard-xs)' : 'none',
              transition: 'all 0.1s ease',
            }}
          >
            <DownloadCloud size={15} strokeWidth={2.5} />
            <span>Export</span>
          </button>
        </nav>

        {/* Right Section: Storage status & Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Subtle real storage indicator */}
          <div
            className="storage-indicator"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              color: '#202020',
              backgroundColor: 'var(--bg-card)',
              border: '2px solid var(--color-border)',
              boxShadow: 'var(--shadow-hard-xs)',
            }}
            title={supabaseConfig.isConnected ? 'Connected to Supabase cloud' : 'Using browser local database storage'}
          >
            {supabaseConfig.isConnected ? (
              <>
                <Cloud size={13} color="var(--color-success)" strokeWidth={3} />
                <span>Supabase</span>
              </>
            ) : (
              <>
                <Database size={13} color="#202020" strokeWidth={2.5} />
                <span>Local DB</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="btn-icon"
            aria-label="Application Settings"
            title="Settings"
          >
            <Settings size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .storage-indicator {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
