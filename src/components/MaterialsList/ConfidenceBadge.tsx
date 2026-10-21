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
    { label: string; bg: string; text: string; icon: React.ReactNode }
  > = {
    high: {
      label: 'Likely Accurate',
      bg: 'var(--color-success)',
      text: '#202020',
      icon: <Check size={12} strokeWidth={2.5} />,
    },
    medium: {
      label: 'Review Recommended',
      bg: 'var(--color-butter-yellow)',
      text: '#202020',
      icon: <AlertTriangle size={12} strokeWidth={2.5} />,
    },
    low: {
      label: 'Verify Before Saving',
      bg: 'var(--color-error)',
      text: '#202020',
      icon: <XCircle size={12} strokeWidth={2.5} />,
    },
    unknown: {
      label: 'Manual Entry Needed',
      bg: 'var(--bg-card)',
      text: '#202020',
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
        borderRadius: 'var(--radius-pill)',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: 'var(--font-serif)',
        backgroundColor: badge.bg,
        color: badge.text,
        border: '1.5px solid var(--color-border)',
        boxShadow: '1.5px 1.5px 0 var(--color-border)',
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
