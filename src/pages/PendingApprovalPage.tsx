// src/pages/PendingApprovalPage.tsx
//
// Phase 4: Pending Approval Page
// Displayed to registered users awaiting Administrator authorization.
// Restricts all access to material records, exports, and uploads.
//

import React, { useState } from 'react';
import { Clock, RefreshCw, LogOut, Mail, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface PendingApprovalPageProps {
  onNavigate: (route: any) => void;
}

export const PendingApprovalPage: React.FC<PendingApprovalPageProps> = ({ onNavigate }) => {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [checkStatusMessage, setCheckStatusMessage] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsChecking(true);
    setCheckStatusMessage(null);
    try {
      await refreshProfile();
      // If approved, refreshProfile updates state and router will redirect
      setCheckStatusMessage('Status checked. Still pending administrator review.');
    } catch (e) {
      console.error('Error checking status:', e);
      setCheckStatusMessage('Could not verify status. Please check your connection.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('/login');
  };

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
          maxWidth: '500px',
          padding: '36px 30px',
          background: 'var(--bg-card)',
          boxSizing: 'border-box',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Pending Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEF3C7',
            border: '2.5px solid var(--color-border)',
            boxShadow: 'var(--shadow-hard-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '18px',
          }}
        >
          <Clock size={32} strokeWidth={2.5} color="#D97706" />
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
          Your account is awaiting administrator approval.
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5, maxWidth: '420px' }}>
          Thank you for registering. In accordance with PW Materials security policies, every new registration must be approved by an authorized administrator before materials, invoices, and exports can be accessed.
        </p>

        {/* Account Metadata Card */}
        <div
          style={{
            width: '100%',
            background: '#FFFFFF',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-hard-xs)',
            padding: '16px',
            margin: '22px 0 16px',
            textAlign: 'left',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Account Name:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{profile?.full_name || 'Registered User'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Account Email:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{user?.email || profile?.email || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Approval Status:</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: '#FEF3C7',
                color: '#92400E',
                border: '1.5px solid #F59E0B',
                borderRadius: 'var(--radius-pill)',
                padding: '1px 8px',
                fontWeight: 800,
                fontSize: '11px',
              }}
            >
              PENDING REVIEW
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Registration Method:</span>
            <strong style={{ textTransform: 'capitalize' }}>{profile?.registration_method || 'Email'}</strong>
          </div>
        </div>

        {/* Check Status Feedback */}
        {checkStatusMessage && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              background: 'rgba(255, 255, 255, 0.7)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              marginBottom: '16px',
            }}
          >
            {checkStatusMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isChecking}
            className="btn btn-primary"
            style={{ flex: 1, minWidth: '160px', height: '42px', fontSize: '13px' }}
          >
            <RefreshCw size={15} className={isChecking ? 'spin' : ''} />
            <span>{isChecking ? 'Checking...' : 'Refresh Status'}</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="btn btn-secondary"
            style={{ flex: 1, minWidth: '120px', height: '42px', fontSize: '13px' }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Guidance Footer */}
        <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Need expedited access? Please contact your organization's PW Materials administrator directly.
        </div>
      </div>
    </div>
  );
};
