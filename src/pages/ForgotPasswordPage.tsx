// src/pages/ForgotPasswordPage.tsx
//
// Phase 2: Forgot Password Page
// User enters registered email to receive a password reset link.
//

import React, { useState } from 'react';
import { Mail, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';

interface ForgotPasswordPageProps {
  onNavigate: (route: any) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.sendPasswordResetEmail(email.trim());
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Password reset request error:', err);
      setErrorMessage(err.message || 'Failed to send reset email. Please try again later.');
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
            <Mail size={22} strokeWidth={2.5} color="#202020" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
            Reset Password
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Enter your email and we'll send you a link to choose a new password.
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
              <strong style={{ fontSize: '15px' }}>Reset link dispatched!</strong>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
              Check your inbox for <strong>{email}</strong> and follow the link to reset your password.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="btn btn-primary"
              style={{ marginTop: '8px', height: '40px', fontSize: '13px' }}
            >
              Back to Sign In
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
                  Registered Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
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
                  <Mail
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
                    <span>Sending link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
