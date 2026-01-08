import React from 'react';
import type { Platform } from '../types';
import { clsx } from 'clsx';
import { Tv, MessageSquare, Zap } from 'lucide-react';

interface PlatformAvatarProps {
  platform: Platform;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const PlatformAvatar: React.FC<PlatformAvatarProps> = ({ platform, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-12 h-12 p-2.5',
    lg: 'w-16 h-16 p-3',
    xl: 'w-24 h-24 p-4',
  };

  const colors = {
    bilibili: 'bg-app-bilibili shadow-[0_0_15px_rgba(255,105,180,0.5)]',
    weibo: 'bg-app-weibo shadow-[0_0_15px_rgba(255,215,0,0.5)]',
    zhihu: 'bg-app-zhihu shadow-[0_0_15px_rgba(0,132,255,0.5)]',
  };

  const icons = {
    bilibili: Tv,
    weibo: Zap,
    zhihu: MessageSquare,
  };

  const Icon = icons[platform];

  return (
    <div className={clsx(
      'rounded-xl flex items-center justify-center text-white',
      colors[platform],
      sizeClasses[size],
      className
    )}>
      <Icon className="w-full h-full" strokeWidth={2.5} />
    </div>
  );
};
