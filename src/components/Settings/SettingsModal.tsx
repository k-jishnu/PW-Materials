// src/components/Settings/SettingsModal.tsx
import React, { useState } from 'react';
import { X, Sparkles, Database, Code, Check, AlertCircle, Copy } from 'lucide-react';
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
  const [model, setModel] = useState(gatewayConfig.model);
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
    alert('AI Inference Gateway settings saved successfully.');
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
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
        maxWidth: '540px',
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
          borderBottom: '2px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>
              System Configuration
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Inference Gateway, Supabase Sync &amp; Database Architecture
            </p>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ width: '34px', height: '34px' }}>
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
              background: activeTab === 'gateway' ? 'var(--color-yellow)' : 'transparent',
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
            <span>AI Gateway</span>
          </button>

          <button
            onClick={() => setActiveTab('supabase')}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'var(--font-serif)',
              color: '#202020',
              background: activeTab === 'supabase' ? 'var(--color-yellow)' : 'transparent',
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
              background: activeTab === 'schema' ? 'var(--color-yellow)' : 'transparent',
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
                background: '#F0FDF4',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}>
                <Sparkles size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: '#166534' }}>
                  <strong>Built-in AI Vision active:</strong> You can take photos and test sample invoices immediately! To route through your custom Claude Desktop Inference Gateway, toggle the switch below.
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                    Use Live Claude Vision Gateway
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Route calls to endpoint via POST /v1/messages
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={useLiveGateway}
                  onChange={(e) => setUseLiveGateway(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
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
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
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

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  <option value="claude-opus-4">claude-opus-4 (Recommended)</option>
                  <option value="claude-sonnet-4">claude-sonnet-4</option>
                  <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                <Check size={16} />
                Save Gateway Settings
              </button>
            </form>
          )}

          {activeTab === 'supabase' && (
            <form onSubmit={handleSaveSupabase} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: '#EFF6FF',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #BFDBFE',
                fontSize: '12px',
                color: '#1E40AF',
              }}>
                <strong>Cloud &amp; Offline Resilient:</strong> When connected, all purchases automatically push to Supabase. When offline or unconfigured, data persists locally in high-speed browser storage.
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
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
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Supabase Anon Public Key
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
                  borderRadius: '10px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: supabaseTestMsg.success ? '#DCFCE7' : '#FEF2F2',
                  color: supabaseTestMsg.success ? '#15803D' : '#991B1B',
                  border: `1px solid ${supabaseTestMsg.success ? '#86EFAC' : '#FECACA'}`,
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
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                  PostgreSQL / Supabase Schema Definition
                </span>
                <button
                  onClick={copySQL}
                  className="btn btn-secondary"
                  style={{ height: '32px', padding: '4px 10px', fontSize: '12px' }}
                >
                  {copiedSchema ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  <span>{copiedSchema ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>

              <pre style={{
                background: '#0F172A',
                color: '#E2E8F0',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '11px',
                lineHeight: 1.5,
                overflowX: 'auto',
                fontFamily: 'var(--font-mono)',
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
