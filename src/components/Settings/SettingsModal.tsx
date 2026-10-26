// src/components/Settings/SettingsModal.tsx
import React from 'react';
import { X, User } from 'lucide-react';
import { GatewayConfig, SupabaseConfig } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayConfig: GatewayConfig;
  onSaveGatewayConfig: (config: Partial<GatewayConfig>) => void;
  supabaseConfig: SupabaseConfig;
  onSaveSupabaseConfig: (config: Partial<SupabaseConfig>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(32, 32, 32, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '12px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        boxShadow: 'var(--shadow-hard-lg)',
        overflow: 'hidden',
        border: '2.5px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '2.5px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
              Settings
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              PW Materials Preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '34px', height: '34px' }}
            aria-label="Close modal"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Modal Body (Reserved for upcoming User Profile section) */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'var(--bg-card)',
            padding: '24px 20px',
            borderRadius: 'var(--radius-md)',
            border: '2px solid var(--color-border)',
            boxShadow: 'var(--shadow-hard-xs)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-logo-bg)',
              border: '2px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#202020',
            }}>
              <User size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', margin: '0 0 4px 0' }}>
                User Profile
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '360px', margin: 0 }}>
                User profile management will be available here soon. AI recognition, Supabase cloud sync, and ledger storage are actively managed via system configuration.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary"
              style={{ minWidth: '90px', height: '38px', fontSize: '13px' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
