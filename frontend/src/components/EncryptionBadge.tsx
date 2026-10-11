import React from 'react';
import { Lock } from 'lucide-react';

interface EncryptionBadgeProps {
  variant?: 'full' | 'compact' | 'icon-only';
  className?: string;
}

export const EncryptionBadge: React.FC<EncryptionBadgeProps> = ({
  variant = 'compact',
  className = '',
}) => {
  if (variant === 'icon-only') {
    return (
      <div className={`relative group inline-flex ${className}`}>
        <Lock size={13} className="text-emerald-400" />
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-white/10">
          End-to-End Encrypted
        </span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 ${className}`}>
        <Lock size={10} className="text-emerald-400" />
        <span className="text-[10px] font-medium text-emerald-400">Encrypted</span>
      </div>
    );
  }

  // full
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Lock size={12} className="text-emerald-400" />
        <span className="text-xs font-medium text-emerald-400">Secure</span>
      </div>
      <span className="text-[10px] text-white/30 px-1">Protected conversation</span>
    </div>
  );
};
