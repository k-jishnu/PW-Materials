// src/components/Layout/BottomNav.tsx
import React from 'react';
import { Camera, Package, DownloadCloud, Settings, Users } from 'lucide-react';
import { ActiveRoute } from '@/hooks/useAppRouter';
import { useAuth } from '@/hooks/useAuth';

interface BottomNavProps {
  currentRoute: ActiveRoute;
  onNavigate: (route: ActiveRoute) => void;
  draftCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentRoute,
  onNavigate,
  draftCount,
}) => {
  const { isAdmin } = useAuth();

  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      {/* 1. Capture */}
      <button
        type="button"
        onClick={() => onNavigate('/capture')}
        className={`bottom-nav-item ${currentRoute === '/capture' ? 'active' : ''}`}
        aria-label="Capture"
        style={{
          background: currentRoute === '/capture' ? 'var(--color-primary-selected)' : 'transparent',
          border: currentRoute === '/capture' ? '2px solid var(--color-border)' : '2px solid transparent',
          borderRadius: 'var(--radius-md)',
          boxShadow: currentRoute === '/capture' ? 'var(--shadow-hard-xs)' : 'none',
          padding: '4px 8px',
        }}
      >
        <Camera size={19} strokeWidth={currentRoute === '/capture' ? 2.5 : 2} />
        <span>Capture</span>
      </button>

      {/* 2. Materials */}
      <button
        type="button"
        onClick={() => onNavigate('/materials')}
        className={`bottom-nav-item ${currentRoute === '/materials' ? 'active' : ''}`}
        aria-label="Materials"
        style={{
          position: 'relative',
          background: currentRoute === '/materials' ? 'var(--color-primary-selected)' : 'transparent',
          border: currentRoute === '/materials' ? '2px solid var(--color-border)' : '2px solid transparent',
          borderRadius: 'var(--radius-md)',
          boxShadow: currentRoute === '/materials' ? 'var(--shadow-hard-xs)' : 'none',
          padding: '4px 8px',
        }}
      >
        <Package size={19} strokeWidth={currentRoute === '/materials' ? 2.5 : 2} />
        <span>Materials</span>
        {draftCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '6px',
              background: 'var(--color-primary)',
              border: '1.5px solid var(--color-border)',
              color: 'var(--color-primary-text)',
              fontSize: '10px',
              fontWeight: 900,
              padding: '1px 5px',
              borderRadius: '10px',
              lineHeight: 1,
            }}
          >
            {draftCount}
          </span>
        )}
      </button>

      {/* 3. Export */}
      <button
        type="button"
        onClick={() => onNavigate('/export')}
        className={`bottom-nav-item ${currentRoute === '/export' ? 'active' : ''}`}
        aria-label="Export"
        style={{
          background: currentRoute === '/export' ? 'var(--color-primary-selected)' : 'transparent',
          border: currentRoute === '/export' ? '2px solid var(--color-border)' : '2px solid transparent',
          borderRadius: 'var(--radius-md)',
          boxShadow: currentRoute === '/export' ? 'var(--shadow-hard-xs)' : 'none',
          padding: '4px 8px',
        }}
      >
        <DownloadCloud size={19} strokeWidth={currentRoute === '/export' ? 2.5 : 2} />
        <span>Export</span>
      </button>

      {/* 4. Settings */}
      <button
        type="button"
        onClick={() => onNavigate('/settings')}
        className={`bottom-nav-item ${currentRoute === '/settings' ? 'active' : ''}`}
        aria-label="Settings"
        style={{
          background: currentRoute === '/settings' ? 'var(--color-primary-selected)' : 'transparent',
          border: currentRoute === '/settings' ? '2px solid var(--color-border)' : '2px solid transparent',
          borderRadius: 'var(--radius-md)',
          boxShadow: currentRoute === '/settings' ? 'var(--shadow-hard-xs)' : 'none',
          padding: '4px 8px',
        }}
      >
        <Settings size={19} strokeWidth={currentRoute === '/settings' ? 2.5 : 2} />
        <span>Settings</span>
      </button>

      {/* Admin Mobile Tab (visible to Admins) */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => onNavigate('/admin/users')}
          className={`bottom-nav-item ${currentRoute === '/admin/users' ? 'active' : ''}`}
          aria-label="Users"
          style={{
            background: currentRoute === '/admin/users' ? '#FEF3C7' : 'transparent',
            border: currentRoute === '/admin/users' ? '2px solid var(--color-border)' : '2px solid transparent',
            borderRadius: 'var(--radius-md)',
            boxShadow: currentRoute === '/admin/users' ? 'var(--shadow-hard-xs)' : 'none',
            padding: '4px 8px',
          }}
        >
          <Users size={19} strokeWidth={currentRoute === '/admin/users' ? 2.5 : 2} color="#D97706" />
          <span>Users</span>
        </button>
      )}
    </nav>
  );
};
