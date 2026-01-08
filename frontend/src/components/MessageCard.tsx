import React from 'react';
import type { DialogueEntry, Platform } from '../types';
import { PlatformAvatar } from './PlatformAvatar';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface MessageCardProps {
  message: DialogueEntry;
  isLast?: boolean;
}

export const MessageCard: React.FC<MessageCardProps> = ({ message, isLast }) => {
  // const isLeft = message.platform === 'bilibili'; // Unused for now
  
  const platformColors: Record<Platform, string> = {
    bilibili: 'border-app-bilibili/30 bg-app-bilibili/5',
    weibo: 'border-app-weibo/30 bg-app-weibo/5',
    zhihu: 'border-app-zhihu/30 bg-app-zhihu/5',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 w-full max-w-4xl mx-auto mb-6 group"
    >
      <div className="flex-shrink-0 mt-1">
        <PlatformAvatar platform={message.platform} size="md" />
      </div>
      
      <div className={clsx(
        "flex-1 rounded-r-xl rounded-bl-xl border p-4 backdrop-blur-md relative overflow-hidden",
        platformColors[message.platform]
      )}>
        {/* Header */}
        <div className="flex justify-between items-center mb-2 opacity-70 text-xs font-mono uppercase tracking-wider">
          <span className="font-bold text-white">{message.speaker}</span>
          <span>Round {message.round} • {new Date(message.timestamp).toLocaleTimeString()}</span>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed font-sans">
          <ReactMarkdown>{message.content}</ReactMarkdown>
          {isLast && (
            <span className="inline-block w-2 h-4 bg-app-primary ml-1 animate-pulse align-middle" />
          )}
        </div>

        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
};
