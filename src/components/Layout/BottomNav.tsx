// src/components/Layout/BottomNav.tsx
import React from 'react';
import { Camera, Package, DownloadCloud, Settings } from 'lucide-react';

export type ActiveTab = 'capture' | 'materials' | 'download';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  draftCount: number;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  draftCount,
  onOpenSettings,
}) => {
  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      <button
        type="button"
        onClick={() => onTabChange('capture')}
        className={`bottom-nav-item ${activeTab === 'capture' ? 'active' : ''}`}
        aria-label="Capture"
        style={{
          background: activeTab === 'capture' ? 'var(--color-yellow)' : 'transparent',
          border: activeTab === 'capture' ? '2px solid var(--color-border)' : '2px solid transparent',
          borderRadius: 'var(--radius-md)',
          boxShadow: activeTab === 'capture' ? 'var(--shadow-hard-xs)' : 'none',
          padding: '4px 10px',
        }}
      >
        <Camera size={19} strokeWidth={activeTab === 'capture' ? 2.5 : 2} />
        <span>Capture</span>
      </button>

      <button
        type="button"
        onClick={() => onTabChange('materials')}
        className={`bottom-nav-item ${activeTab === 'materials' ? 'active' : ''}`}
        aria-label="Materials"
        style={{
          position: 'relative',
          background: activeTab === 'materials' ? 'var(--color-yellow)' : 'transparent',
          border: activeTab === 'materials' ? '2px solid var(--color-border)' : '2px solid transparent',
          borderRadius: 'var(--radius-md)',
          boxShadow: activeTab === 'materials' ? 'var(--shadow-hard-xs)' : 'none',
          padding: '4px 10px',
        }}
      >
        <Package size={19} strokeWidth={activeTab === 'materials' ? 2.5 : 2} />
        <span>Materials</span>
        {draftCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '8px',
            background: 'var(--color-coral)',
            color: '#202020',
            borderRadius: 'var(--radius-pill)',
            border: '1.5px solid var(--color-border)',
            fontSize: '10px',
            fontWeight: 900,
            padding: '1px 5px',
            minWidth: '16px',
            textAlign: 'center',
            lineHeight: '14px',
          }}>
            {draftCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onTabChange('download')}
        className={`bottom-nav-item ${activeTab === 'download' ? 'active' : ''}`}
        aria-label="Export"
        style={{
          background: activeTab === 'download' ? 'var(--color-yellow)' : 'transparent',
          border: activeTab === 'download' ? '2px solid var(--color-border)' : '2px solid transparent',
          borderRadius: 'var(--radius-md)',
          boxShadow: activeTab === 'download' ? 'var(--shadow-hard-xs)' : 'none',
          padding: '4px 10px',
        }}
      >
        <DownloadCloud size={19} strokeWidth={activeTab === 'download' ? 2.5 : 2} />
        <span>Export</span>
      </button>

      <button
        type="button"
        onClick={onOpenSettings}
        className="bottom-nav-item"
        aria-label="Settings"
        style={{ padding: '4px 10px', border: '2px solid transparent' }}
      >
        <Settings size={19} strokeWidth={2} />
        <span>Settings</span>
      </button>
    </nav>
  );
};

