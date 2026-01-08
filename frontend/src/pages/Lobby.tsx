import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNavigate } from 'react-router-dom';
import type { Platform } from '../types';
import { PlatformAvatar } from '../components/PlatformAvatar';
import { Play, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export const Lobby: React.FC = () => {
  const navigate = useNavigate();
  const { topic, setTopic, selectedPlatforms, setSelectedPlatforms, maxRounds, setMaxRounds } = useGameStore();
  const { apiKey, setApiKey } = useSettingsStore();

  const togglePlatform = (p: Platform) => {
    if (selectedPlatforms.includes(p)) {
      setSelectedPlatforms(selectedPlatforms.filter(pl => pl !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const handleStart = () => {
    if (!topic.trim()) return;
    navigate('/arena');
  };

  return (
    <div className="max-w-3xl mx-auto pt-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl md:text-6xl font-display font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
          FREE DEBATE ARENA
        </h2>
        <p className="text-gray-400 font-mono">Initialize neural link. Select agents. Begin conflict.</p>
      </motion.div>

      <div className="grid gap-8">
        {/* API Key Section */}
        <section className="bg-app-panel border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4 text-app-primary">
            <Terminal className="w-5 h-5" />
            <h3 className="font-mono text-sm uppercase font-bold tracking-wider">Access Protocol</h3>
          </div>
          <input
            type="password"
            placeholder="Enter Moonshot API Key (sk-...)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-black/30 border border-app-border rounded-lg px-4 py-3 text-white focus:border-app-primary focus:ring-1 focus:ring-app-primary outline-none font-mono text-sm"
          />
        </section>

        {/* Topic Section */}
        <section className="bg-app-panel border border-app-border rounded-xl p-6">
          <h3 className="font-mono text-sm uppercase font-bold tracking-wider text-gray-400 mb-4">Debate Topic</h3>
          <textarea
            placeholder="e.g. Is artificial intelligence a threat to humanity?"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            className="w-full bg-black/30 border border-app-border rounded-lg px-4 py-3 text-xl text-white focus:border-app-primary focus:ring-1 focus:ring-app-primary outline-none resize-none"
          />
        </section>

        {/* Settings Section */}
        <section className="bg-app-panel border border-app-border rounded-xl p-6">
          <div className="flex items-center gap-4">
             <div className="flex-1">
                <h3 className="font-mono text-sm uppercase font-bold tracking-wider text-gray-400 mb-2">Max Rounds</h3>
                <p className="text-xs text-gray-500 mb-3">The debate will automatically conclude after this many rounds.</p>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={maxRounds} 
                    onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                    className="flex-1 accent-app-primary h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-mono text-2xl font-bold text-app-primary w-12 text-center">{maxRounds}</span>
                </div>
             </div>
          </div>
        </section>

        {/* Platforms Section */}
        <section className="bg-app-panel border border-app-border rounded-xl p-6">
          <h3 className="font-mono text-sm uppercase font-bold tracking-wider text-gray-400 mb-6">Select Agents</h3>
          <div className="flex justify-center gap-8">
            {(['bilibili', 'weibo', 'zhihu'] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`group relative transition-all duration-300 ${selectedPlatforms.includes(p) ? 'scale-110 opacity-100' : 'opacity-50 hover:opacity-80'}`}
              >
                <PlatformAvatar platform={p} size="xl" />
                <div className={`mt-3 text-center font-mono text-sm transition-colors ${selectedPlatforms.includes(p) ? 'text-white font-bold' : 'text-gray-500'}`}>
                  {p.toUpperCase()}
                </div>
                {selectedPlatforms.includes(p) && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-app-primary rounded-full shadow-[0_0_10px_#00F0FF]" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!topic || selectedPlatforms.length < 2}
          className="w-full bg-app-primary text-black font-bold font-display text-xl py-4 rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_40px_rgba(0,240,255,0.5)]"
        >
          <Play fill="currentColor" />
          INITIATE DEBATE
        </button>
      </div>
    </div>
  );
};
