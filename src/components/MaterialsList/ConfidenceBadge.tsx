// src/components/MaterialsList/ConfidenceBadge.tsx
import React from 'react';
import { ConfidenceLevel } from '@/types';
import { Check, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  score?: number;
  labelOverride?: string;
  showIconOnly?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  score,
  labelOverride,
  showIconOnly = false,
}) => {
  const configs: Record<
    ConfidenceLevel,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    high: {
      label: 'Likely Accurate',
      bg: '#DCFCE7',
      text: '#15803D',
      border: '#86EFAC',
      icon: <Check size={12} strokeWidth={3} />,
    },
    medium: {
      label: 'Review Recommended',
      bg: '#FEF9C3',
      text: '#854D0E',
      border: '#FDE047',
      icon: <AlertTriangle size={12} strokeWidth={2.5} />,
    },
    low: {
      label: 'Verify Before Saving',
      bg: '#FEE2E2',
      text: '#991B1B',
      border: '#FCA5A5',
      icon: <XCircle size={12} strokeWidth={2.5} />,
    },
    unknown: {
      label: 'Manual Entry Needed',
      bg: '#F1F5F9',
      text: '#475569',
      border: '#CBD5E1',
      icon: <HelpCircle size={12} strokeWidth={2.5} />,
    },
  };

  const badge = configs[confidence] || configs.unknown;
  const scorePercent = score ? `${Math.round(score * 100)}%` : '';

  return (
    <span
      title={`AI Confidence: ${confidence.toUpperCase()} ${scorePercent ? `(${scorePercent})` : ''} - ${badge.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: showIconOnly ? '3px 6px' : '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: badge.bg,
        color: badge.text,
        border: `1px solid ${badge.border}`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
      role="img"
      aria-label={`${confidence} confidence: ${badge.label}`}
    >
      <span>{badge.icon}</span>
      {!showIconOnly && (
        <span>
          {labelOverride || (score ? `${scorePercent}` : badge.label)}
        </span>
      )}
    </span>
  );
};
