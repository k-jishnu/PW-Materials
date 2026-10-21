// src/components/Settings/SettingsModal.tsx
import React, { useState } from 'react';
import { X, Sparkles, Database, Code, Check, AlertCircle, Copy, Key, ShieldCheck } from 'lucide-react';
import { GatewayConfig, SupabaseConfig } from '@/types';
import { supabaseService } from '@/services/supabaseClient';
import { gatewayAPI } from '@/services/gatewayAPI';

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
  gatewayConfig,
  onSaveGatewayConfig,
  supabaseConfig,
  onSaveSupabaseConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'gateway' | 'supabase' | 'schema'>('gateway');

  // Gateway form state
  const [baseUrl, setBaseUrl] = useState(gatewayConfig.baseUrl);
  const [apiKey, setApiKey] = useState(gatewayConfig.apiKey);
  const [model, setModel] = useState(gatewayConfig.model || 'gpt-4o-mini');
  const [useLiveGateway, setUseLiveGateway] = useState(gatewayConfig.useLiveClaudeGateway);

  // Supabase form state
  const [sbUrl, setSbUrl] = useState(supabaseConfig.url);
  const [sbAnonKey, setSbAnonKey] = useState(supabaseConfig.anonKey);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseTestMsg, setSupabaseTestMsg] = useState<{ success: boolean; message: string } | null>(null);

  const [copiedSchema, setCopiedSchema] = useState(false);

  if (!isOpen) return null;

  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveGatewayConfig({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      model,
      useLiveClaudeGateway: useLiveGateway,
    });
    alert('AI Inference settings saved successfully.');
  };

  const handleSaveSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSupabaseConfig({
      url: sbUrl.trim(),
      anonKey: sbAnonKey.trim(),
    });
    alert('Supabase credentials saved successfully.');
  };

  const handleTestSupabase = async () => {
    setTestingSupabase(true);
    setSupabaseTestMsg(null);
    try {
      // Temporarily save to test
      supabaseService.saveConfig({ url: sbUrl.trim(), anonKey: sbAnonKey.trim() });
      const res = await supabaseService.testConnection();
      setSupabaseTestMsg(res);
    } finally {
      setTestingSupabase(false);
    }
  };

  const copySQL = () => {
    navigator.clipboard.writeText(supabaseService.getSupabaseSQLSchema());
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

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
        maxWidth: '560px',
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
              System Configuration
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              OpenAI Vision, Supabase PostgreSQL Sync &amp; Storage Architecture
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: '34px', height: '34px' }} aria-label="Close modal">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid var(--color-border)',
          background: 'var(--bg-surface-subtle)',
          padding: '6px 12px',
          gap: '6px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}>
          <button
            onClick={() => setActiveTab('gateway')}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              color: '#202020',
              background: activeTab === 'gateway' ? 'var(--color-primary-selected)' : 'transparent',
              border: activeTab === 'gateway' ? '2px solid var(--color-border)' : '2px solid transparent',
              boxShadow: activeTab === 'gateway' ? 'var(--shadow-hard-xs)' : 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Sparkles size={14} strokeWidth={2.5} />
            <span>AI Vision Engine</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              color: '#202020',
              background: activeTab === 'supabase' ? 'var(--color-primary-selected)' : 'transparent',
              border: activeTab === 'supabase' ? '2px solid var(--color-border)' : '2px solid transparent',
              boxShadow: activeTab === 'supabase' ? 'var(--shadow-hard-xs)' : 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Database size={14} strokeWidth={2.5} />
            <span>Supabase Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              color: '#202020',
              background: activeTab === 'schema' ? 'var(--color-primary-selected)' : 'transparent',
              border: activeTab === 'schema' ? '2px solid var(--color-border)' : '2px solid transparent',
              boxShadow: activeTab === 'schema' ? 'var(--shadow-hard-xs)' : 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <Code size={14} strokeWidth={2.5} />
            <span>SQL Schema</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'gateway' && (
            <form onSubmit={handleSaveGateway} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'var(--bg-card)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
                boxShadow: 'var(--shadow-hard-xs)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}>
                <ShieldCheck size={20} color="#202020" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  <strong>Secure Server-Side OpenAI Vision Active:</strong>
                  <br />
                  Configure <code className="mono" style={{ background: '#FFF', padding: '1px 4px', border: '1px solid #202020', borderRadius: '4px' }}>OPENAI_API_KEY</code> and <code className="mono" style={{ background: '#FFF', padding: '1px 4px', border: '1px solid #202020', borderRadius: '4px' }}>OPENAI_MODEL=gpt-4o-mini</code> in your local <code className="mono">.env</code> file or server environment variables. API keys are kept safe on the server and never sent to the browser.
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Use Custom Live Vision Gateway
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Route calls to external gateway via POST /v1/messages
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useLiveGateway}
                  onChange={(e) => setUseLiveGateway(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {useLiveGateway && (
                <>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      Gateway Base URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-gateway.example.com"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="input-base"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                      Bearer API Key
                    </label>
                    <input
                      type="password"
                      placeholder="sk-your-gateway-key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="input-base"
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  OpenAI Vision Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '2px solid var(--color-border)',
                    fontSize: '13px',
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    background: 'var(--bg-surface)',
                  }}
                >
                  <option value="gpt-4o-mini">gpt-4o-mini (Recommended — Economical, High-Speed &amp; Accurate)</option>
                  <option value="gpt-4o">gpt-4o (Maximum Precision Vision Model)</option>
                  <option value="claude-opus-4">claude-opus-4 (Legacy Custom Gateway)</option>
                  <option value="claude-sonnet-4">claude-sonnet-4 (Legacy Custom Gateway)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                <Check size={16} />
                <span>Save Vision Configuration</span>
              </button>
            </form>
          )}

          {activeTab === 'supabase' && (
            <form onSubmit={handleSaveSupabase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'var(--bg-card)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
                boxShadow: 'var(--shadow-hard-xs)',
                fontSize: '12px',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}>
                <strong>Cloud &amp; Offline Resilient:</strong> When configured, confirmed materials and invoices are stored in Supabase PostgreSQL and invoice photos in Supabase Storage. When offline or unconfigured, data persists locally in high-speed browser storage.
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzproject.supabase.co"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  className="input-base"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Supabase Anon Public Key (Safe for Frontend)
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={sbAnonKey}
                  onChange={(e) => setSbAnonKey(e.target.value)}
                  className="input-base"
                />
              </div>

              {supabaseTestMsg && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: supabaseTestMsg.success ? 'var(--color-success)' : 'var(--color-error)',
                  color: '#202020',
                  border: '2px solid var(--color-border)',
                  boxShadow: 'var(--shadow-hard-xs)',
                }}>
                  {supabaseTestMsg.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{supabaseTestMsg.message}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={testingSupabase}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  {testingSupabase ? 'Testing...' : 'Test Connection'}
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Credentials
                </button>
              </div>
            </form>
          )}

          {activeTab === 'schema' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Supabase PostgreSQL Schema (Invoices, Items, Catalog &amp; RLS)
                </span>
                <button
                  onClick={copySQL}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '32px' }}
                >
                  {copiedSchema ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedSchema ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>

              <pre style={{
                background: '#0F172A',
                color: '#E2E8F0',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '11px',
                lineHeight: 1.5,
                overflowX: 'auto',
                fontFamily: 'var(--font-mono)',
                border: '2px solid var(--color-border)',
                boxShadow: 'var(--shadow-hard-xs)',
              }}>
                {supabaseService.getSupabaseSQLSchema()}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
