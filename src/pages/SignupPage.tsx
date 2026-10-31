// src/pages/SignupPage.tsx
//
// Phase 2: Signup Page
// Full name, email, password, confirm password, Google signup, inline validation.
//

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/authService';

interface SignupPageProps {
  onNavigate: (route: any) => void;
  onSuccess: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onNavigate, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    if (!termsAccepted) {
      setErrorMessage('Please acknowledge the terms and administrator approval policy.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.signUpWithEmail(email.trim(), password, fullName.trim());
      // Check if email confirmation is required by Supabase
      if (data.user && !data.session) {
        setSuccessNotice('Account created! Please check your email to verify your address before logging in.');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const msg = err.message || 'Registration failed. Please try again.';
      if (msg.includes('already registered')) {
        setErrorMessage('This email is already registered. Please sign in or use password recovery.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setErrorMessage(err.message || 'Failed to initialize Google Sign-in.');
      setIsGoogleLoading(false);
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
          maxWidth: '460px',
          padding: '32px 28px',
          background: 'var(--bg-card)',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo & Header */}
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#202020" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6a1.78 1.78 0 0 0 0-3.2z" />
              <path d="M21 7v10" />
            </svg>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
            Create an Account
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Register to request access to PW Materials inventory and invoices.
          </p>
        </div>

        {/* Success Notice (e.g. Email verification sent) */}
        {successNotice && (
          <div
            style={{
              background: 'var(--color-success)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4,
              boxShadow: 'var(--shadow-hard-xs)',
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong>Verification link sent:</strong> {successNotice}
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="btn btn-primary btn-sm"
                  style={{ height: '30px', fontSize: '12px' }}
                >
                  Proceed to Login
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inline Error Message */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
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
              <User
                size={16}
                color="var(--text-secondary)"
                style={{ position: 'absolute', left: '12px', top: '13px', pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Email Address *
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

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Password (min. 6 characters) *
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
              Confirm Password *
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

          {/* Terms & Approval Notice */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '2px' }}>
            <input
              type="checkbox"
              id="terms"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ width: '16px', height: '16px', marginTop: '3px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
            <label htmlFor="terms" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4 }}>
              I understand that registration requires <strong>administrator approval</strong> before application data and records can be accessed.
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '44px',
              fontSize: '14px',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: '20px 0',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          <span style={{ padding: '0 12px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading}
          className="btn btn-secondary"
          style={{
            width: '100%',
            height: '44px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: '#FFFFFF',
          }}
        >
          {isGoogleLoading ? (
            <>
              <RefreshCw size={16} className="spin" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Footer Link */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontWeight: 800,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
