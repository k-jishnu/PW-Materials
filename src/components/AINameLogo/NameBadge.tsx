// src/components/AINameLogo/NameBadge.tsx
import React, { useState } from 'react';
import { Sparkles, Edit2, Check, CheckCircle2 } from 'lucide-react';

interface NameBadgeProps {
  companyName: string;
  vendorName?: string;
  confidenceScore?: number;
  onUpdateCompany?: (newName: string) => void;
}

export const NameBadge: React.FC<NameBadgeProps> = ({
  companyName,
  vendorName,
  confidenceScore = 0.92,
  onUpdateCompany,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(companyName || 'PW Materials');

  const handleSave = () => {
    setIsEditing(false);
    if (onUpdateCompany && currentValue.trim()) {
      onUpdateCompany(currentValue.trim());
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #E1BEE7 0%, #CE93D8 100%)',
        color: '#4A148C',
        padding: '10px 16px',
        borderRadius: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        width: '100%',
        boxShadow: '0 4px 12px rgba(74, 20, 140, 0.08)',
        border: '1px solid #BA68C8',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Sparkles size={16} color="#4A148C" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            AI Recognized Entity
          </div>
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <input
                type="text"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
                style={{
                  background: 'white',
                  border: '1.5px solid #4A148C',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#4A148C',
                  outline: 'none',
                  width: '100%',
                  maxWidth: '240px',
                }}
              />
              <button
                onClick={handleSave}
                style={{
                  background: '#4A148C',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#4A148C' }}>
                {currentValue || 'PW Materials'}
              </span>
              {vendorName && (
                <span style={{ fontSize: '13px', fontWeight: 500, opacity: 0.85 }}>
                  • {vendorName}
                </span>
              )}
              <button
                onClick={() => setIsEditing(true)}
                title="Edit Recognized Entity"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  color: '#4A148C',
                  opacity: 0.7,
                  display: 'inline-flex',
                }}
              >
                <Edit2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.65)',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#4A148C',
      }}>
        <CheckCircle2 size={14} color="#15803D" />
        <span>Verified {Math.round(confidenceScore * 100)}%</span>
      </div>
    </div>
  );
};
