// src/pages/AccessDeniedPage.tsx
//
// Access Denied / Account Suspended / Rejected Page
// Displayed when an account has been rejected or suspended by an Administrator.
//

import React from 'react';
import { ShieldX, LogOut, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AccessDeniedPageProps {
  onNavigate: (route: any) => void;
  statusType?: 'REJECTED' | 'SUSPENDED';
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ onNavigate, statusType = 'REJECTED' }) => {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/login');
  };

  const isSuspended = statusType === 'SUSPENDED' || profile?.approval_status === 'SUSPENDED';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backgroundColor: 'var(--bg-page)',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '36px 30px',
          background: 'var(--bg-card)',
          boxSizing: 'border-box',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            border: '2.5px solid var(--color-border)',
            boxShadow: 'var(--shadow-hard-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
          }}
        >
          <ShieldX size={32} strokeWidth={2.5} color="#DC2626" />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
          {isSuspended ? 'Account Access Restricted' : 'Access Request Denied'}
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
          {isSuspended
            ? 'Your account has been temporarily deactivated by an administrator. Please reach out to your supervisor to resolve this suspension.'
            : 'Your registration request could not be approved at this time. Access to PW Materials records and features is restricted.'}
        </p>

        <div
          style={{
            width: '100%',
            background: '#FFFFFF',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-hard-xs)',
            padding: '16px',
            margin: '20px 0',
            textAlign: 'left',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Account:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{user?.email || profile?.email || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Status:</span>
            <span
              style={{
                display: 'inline-block',
                background: '#FEE2E2',
                color: '#991B1B',
                border: '1.5px solid #EF4444',
                borderRadius: 'var(--radius-pill)',
                padding: '1px 8px',
                fontWeight: 800,
                fontSize: '11px',
              }}
            >
              {isSuspended ? 'SUSPENDED' : 'REJECTED'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="btn btn-secondary"
          style={{ width: '100%', height: '42px', fontSize: '13px' }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
