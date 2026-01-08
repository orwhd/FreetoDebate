import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore'; // Import settings store
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SettingsModal } from './SettingsModal'; // Import modal

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { gameState } = useGameStore();
  const { toggleSettings } = useSettingsStore(); // Get toggle function

  return (
    <div className="min-h-screen bg-app-bg text-gray-100 relative selection:bg-app-primary selection:text-black">
      {/* Settings Modal */}
      <SettingsModal />

      {/* Background Grid */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(42, 47, 69, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(42, 47, 69, 1) 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }} 
      />
      
      {/* Vignette */}
      <div className="fixed inset-0 z-0 bg-radial-gradient from-transparent to-app-bg pointer-events-none" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 border-b border-app-border/30 bg-app-bg/80 backdrop-blur-md z-50 flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-app-primary text-black flex items-center justify-center font-bold rounded-sm group-hover:animate-pulse">
            FD
          </div>
          <h1 className="font-display font-bold text-xl tracking-wider uppercase text-white">
            Free<span className="text-app-primary">ToDebate</span>
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-8 ml-10 mr-auto">
          <Link to="/" className="text-gray-400 hover:text-app-primary transition-colors font-mono text-sm uppercase tracking-wide hover:shadow-[0_0_10px_rgba(0,240,255,0.3)]">Lobby</Link>
          <Link to="/arena" className="text-gray-400 hover:text-app-primary transition-colors font-mono text-sm uppercase tracking-wide hover:shadow-[0_0_10px_rgba(0,240,255,0.3)]">Arena</Link>
          <Link to="/analysis" className="text-gray-400 hover:text-app-primary transition-colors font-mono text-sm uppercase tracking-wide hover:shadow-[0_0_10px_rgba(0,240,255,0.3)]">Analysis</Link>
        </nav>

        <div className="flex items-center gap-4 text-sm font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${gameState === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            <span>{gameState === 'idle' ? 'SYSTEM IDLE' : 'SYSTEM ACTIVE'}</span>
          </div>
          <div className="h-4 w-[1px] bg-gray-700" />
          <button onClick={() => toggleSettings(true)} className="hover:text-white transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-20 px-4 max-w-7xl mx-auto pb-10">
        {children}
      </main>
    </div>
  );
};
