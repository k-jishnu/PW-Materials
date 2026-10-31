// src/pages/ResetPasswordPage.tsx
//
// Phase 2: Reset Password Page
// User enters and confirms new password after clicking the reset link in their email.
//

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';

interface ResetPasswordPageProps {
  onNavigate: (route: any) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigate }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.updateUserPassword(password);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Update password error:', err);
      setErrorMessage(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setIsLoading(false);
    }
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
          maxWidth: '440px',
          padding: '32px 28px',
          background: 'var(--bg-card)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-logo-bg)',
              border: '2.5px solid var(--color-border)',
              boxShadow: 'var(--shadow-hard-xs)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <Lock size={22} strokeWidth={2.5} color="#202020" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
            Set New Password
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Choose a strong password to secure your PW Materials account.
          </p>
        </div>

        {isSuccess ? (
          <div
            style={{
              background: 'var(--color-success)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: 'var(--shadow-hard-xs)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} strokeWidth={2.5} />
              <strong style={{ fontSize: '15px' }}>Password Updated!</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
              Your password has been changed successfully. You can now sign in with your new credentials.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="btn btn-primary"
              style={{ marginTop: '8px', height: '40px', fontSize: '13px' }}
            >
              Sign In Now
            </button>
          </div>
        ) : (
          <>
            {errorMessage && (
              <div
                style={{
                  background: '#FEE2E2',
                  border: '2px solid #EF4444',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  marginBottom: '20px',
                  color: '#991B1B',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  New Password (min. 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 38px 0 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--color-border)',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock
                    size={16}
                    color="var(--text-secondary)"
                    style={{ position: 'absolute', left: '12px', top: '13px', pointerEvents: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-secondary)',
                      padding: '2px',
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px 0 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--color-border)',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Lock
                    size={16}
                    color="var(--text-secondary)"
                    style={{ position: 'absolute', left: '12px', top: '13px', pointerEvents: 'none' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '14px',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
