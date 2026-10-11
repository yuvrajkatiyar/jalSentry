import React from 'react';
import { EvidenceConfidenceLevel } from '../core/types';

export const ConfidenceBadge: React.FC<{ level: EvidenceConfidenceLevel }> = ({ level }) => {
  const styles: Record<EvidenceConfidenceLevel, { bg: string; text: string; label: string }> = {
    weak: {
      bg: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
      text: 'border-zinc-300 dark:border-zinc-700',
      label: 'Weak Evidence (Verification Trigger)',
    },
    moderate: {
      bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
      text: 'border-blue-200 dark:border-blue-800',
      label: 'Moderate Evidence',
    },
    strong: {
      bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
      text: 'border-purple-200 dark:border-purple-800',
      label: 'Strong Multi-Source Evidence',
    },
  };

  const c = styles[level] || styles.weak;

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};
