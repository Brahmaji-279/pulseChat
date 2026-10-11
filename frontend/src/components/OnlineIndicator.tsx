import React from 'react';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  isOnline,
  size = 'md',
  className = '',
  showText = false,
}) => {
  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex items-center justify-center">
        {isOnline && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${sizeMap[size]}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full ${sizeMap[size]} ${
            isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-zinc-600'
          }`}
        />
      </span>
      {showText && (
        <span className={`text-xs ${isOnline ? 'text-emerald-400' : 'text-zinc-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};
