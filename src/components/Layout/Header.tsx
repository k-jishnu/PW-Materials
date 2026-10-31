// src/components/Layout/Header.tsx
import React from 'react';
import { Camera, Package, DownloadCloud, Settings, Users, LogOut, Shield } from 'lucide-react';
import { ActiveRoute } from '@/hooks/useAppRouter';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  currentRoute: ActiveRoute;
  onNavigate: (route: ActiveRoute) => void;
  draftCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  draftCount,
}) => {
  const { profile, isAdmin, isRootAdmin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/login');
  };

  return (
    <header className="app-header">
      <div
        style={{
          maxWidth: '1140px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: '16px',
        }}
      >
        {/* Brand / Logo: Light Yellow #FFF0BC background, bold black border, hard offset shadow */}
        <div
          onClick={() => onNavigate('/capture')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
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
              color: '#202020',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#202020"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z" />
              <path d="M21 7v10" />
            </svg>
          </div>
          <div>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-serif)',
                letterSpacing: '-0.02em',
              }}
            >
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
          {/* 1. Capture */}
          <button
            type="button"
            onClick={() => onNavigate('/capture')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: currentRoute === '/capture' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: currentRoute === '/capture' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: currentRoute === '/capture' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <Camera size={15} strokeWidth={currentRoute === '/capture' ? 2.8 : 2} />
            <span>Capture</span>
          </button>

          {/* 2. Materials */}
          <button
            type="button"
            onClick={() => onNavigate('/materials')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: currentRoute === '/materials' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: currentRoute === '/materials' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: currentRoute === '/materials' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              position: 'relative',
            }}
          >
            <Package size={15} strokeWidth={currentRoute === '/materials' ? 2.8 : 2} />
            <span>Materials</span>
            {draftCount > 0 && (
              <span
                style={{
                  background: 'var(--color-primary)',
                  border: '1.5px solid var(--color-border)',
                  color: 'var(--color-primary-text)',
                  fontSize: '10px',
                  fontWeight: 900,
                  padding: '1px 5px',
                  borderRadius: '10px',
                  lineHeight: 1,
                  marginLeft: '2px',
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: currentRoute === '/export' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: currentRoute === '/export' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: currentRoute === '/export' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <DownloadCloud size={15} strokeWidth={currentRoute === '/export' ? 2.8 : 2} />
            <span>Export</span>
          </button>

          {/* 4. Settings */}
          <button
            type="button"
            onClick={() => onNavigate('/settings')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: currentRoute === '/settings' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: currentRoute === '/settings' ? 'var(--color-primary-selected)' : 'transparent',
              boxShadow: currentRoute === '/settings' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <Settings size={15} strokeWidth={currentRoute === '/settings' ? 2.8 : 2} />
            <span>Settings</span>
          </button>

          {/* Admin User Management Nav (Visible to ADMIN and ROOT_ADMIN only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('/admin/users')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: currentRoute === '/admin/users' ? '2px solid var(--color-border)' : '2px solid transparent',
                background: currentRoute === '/admin/users' ? '#FEF3C7' : 'transparent',
                boxShadow: currentRoute === '/admin/users' ? 'var(--shadow-hard-xs)' : 'none',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <Users size={15} strokeWidth={currentRoute === '/admin/users' ? 2.8 : 2} color="#D97706" />
              <span>Users</span>
            </button>
          )}

          {/* User Role Badge & Sign Out Button */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '8px',
              paddingLeft: '8px',
              borderLeft: '1.5px solid var(--color-border)',
            }}
          >
            {profile && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1.5px solid var(--color-border)',
                  background: isRootAdmin
                    ? '#FEE2E2'
                    : isAdmin
                    ? '#FEF3C7'
                    : 'var(--bg-card)',
                  color: 'var(--text-primary)',
                }}
              >
                {profile.role}
              </span>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-icon"
              style={{ width: '32px', height: '32px' }}
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
