// src/pages/AuthCallbackPage.tsx
//
// Handles OAuth callback redirects (e.g. from Google or Supabase email confirmation links)
// Automatically exchanges tokens, refreshes profile, and routes to appropriate page.
//

import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';

interface AuthCallbackPageProps {
  onNavigate: (route: any) => void;
}

export const AuthCallbackPage: React.FC<AuthCallbackPageProps> = ({ onNavigate }) => {
  const { refreshProfile } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const { session, error } = await authService.getSession();
        if (error) throw error;

        if (session?.user) {
          await refreshProfile();
          // Profile check will be handled by the top-level route guard in App.tsx
          onNavigate('/capture');
        } else {
          // If no session found in URL hash/cookie, redirect to login
          onNavigate('/login');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setErrorMsg(err.message || 'Authentication callback failed.');
      }
    }

    handleCallback();
  }, [onNavigate, refreshProfile]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg-page)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px 24px',
          background: 'var(--bg-card)',
          textAlign: 'center',
        }}
      >
        {errorMsg ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={32} color="#DC2626" />
            <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>Authentication Error</h2>
            <p style={{ fontSize: '13px', color: '#991B1B', margin: 0 }}>{errorMsg}</p>
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="btn btn-primary"
              style={{ marginTop: '12px', height: '38px', fontSize: '13px' }}
            >
              Return to Login
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw size={32} className="spin" color="var(--color-primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>Authenticating...</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Verifying your security credentials. You will be redirected shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

