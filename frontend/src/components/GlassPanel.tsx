import React from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
  glow?: 'none' | 'violet' | 'cyan';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  variant = 'default',
  glow = 'none',
  ...props
}) => {
  const baseStyles = 'backdrop-blur-xl rounded-2xl transition-all duration-200';

  const variantStyles = {
    default: 'bg-[#121212]/75 border border-white/10 shadow-2xl shadow-black/60',
    elevated: 'bg-[#161616]/85 border border-white/[0.14] shadow-[0_8px_32px_rgba(0,0,0,0.8)]',
    subtle: 'bg-[#0c0c0c]/60 border border-white/[0.07] shadow-lg shadow-black/40',
  };

  const glowStyles = {
    none: '',
    violet: 'shadow-[0_0_25px_rgba(138,43,226,0.18)] border-violet-500/30',
    cyan: 'shadow-[0_0_25px_rgba(0,240,255,0.18)] border-cyan-500/30',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${glowStyles[glow]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
