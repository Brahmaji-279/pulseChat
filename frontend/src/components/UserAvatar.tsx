import React from 'react';
import { OnlineIndicator } from './OnlineIndicator.js';

interface UserAvatarProps {
  username?: string;
  displayName?: string;
  photoUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  showStatus?: boolean;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  username = '',
  displayName = '',
  photoUrl,
  size = 'md',
  isOnline,
  showStatus = false,
  className = '',
}) => {
  const name = displayName || username || '?';
  const initial = name.charAt(0).toUpperCase();

  const sizeDimensions = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl font-bold',
  };

  const indicatorSizes = {
    xs: 'sm' as const,
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
    xl: 'lg' as const,
  };

  // Generate deterministic gradient based on username string
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-violet-600 to-indigo-800',
    'from-cyan-600 to-blue-800',
    'from-fuchsia-600 to-purple-900',
    'from-emerald-600 to-teal-900',
    'from-rose-600 to-pink-900',
  ];
  const selectedGradient = gradients[hash % gradients.length];

  return (
    <div className={`relative inline-block select-none ${className}`}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className={`${sizeDimensions[size]} rounded-full object-cover border border-white/10 shadow-md bg-zinc-900`}
          onError={(e) => {
            // Fallback to initials if image load fails
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeDimensions[size]} rounded-full bg-gradient-to-br ${selectedGradient} flex items-center justify-center font-medium text-white shadow-inner border border-white/15`}
        >
          {initial}
        </div>
      )}

      {showStatus && isOnline !== undefined && (
        <div className="absolute -bottom-0.5 -right-0.5 bg-[#030303] rounded-full p-0.5 border border-black">
          <OnlineIndicator isOnline={isOnline} size={indicatorSizes[size]} />
        </div>
      )}
    </div>
  );
};
