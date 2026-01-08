import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameSocket } from '../hooks/useGameSocket';
import { useSettingsStore } from '../store/settingsStore';
import { MessageCard } from '../components/MessageCard';
import { PlatformAvatar } from '../components/PlatformAvatar';
import { Play, RotateCcw, StopCircle, UserSearch, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const Arena: React.FC = () => {
  const navigate = useNavigate();
  const { messages, gameState, activeSpeaker, topic } = useGameStore();
  const { apiKey } = useSettingsStore();
  const { startGame, stopGame } = useGameSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Record<string, any> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Auto-start if not running
    if (gameState === 'idle') {
      startGame();
    }
    // Cleanup on unmount handled by socket hook implicitly
  }, []);

  useEffect(() => {
    if (gameState === 'running') {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSpeaker]);

  const handleStop = () => {
    stopGame();
    navigate('/');
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    try {
        const response = await fetch('http://localhost:8000/api/analyze_personality', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic,
                history: messages.map(m => ({ speaker: m.speaker, content: m.content })),
                api_key: apiKey
            })
        });
        
        if (!response.ok) throw new Error('Analysis failed');
        
        const data = await response.json();
        setAnalysisResult(data);
    } catch (e) {
        console.error(e);
        // Show error state in modal?
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      {/* Top Bar: Topic & Active Speaker */}
      <div className="flex-shrink-0 mb-6 flex justify-between items-end border-b border-app-border/30 pb-4">
        <div>
          <h2 className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-1">Current Topic</h2>
          <h1 className="text-2xl font-display font-bold text-white max-w-2xl line-clamp-2">{topic}</h1>
        </div>
        
        {activeSpeaker && (
          <div className="flex items-center gap-3 animate-pulse">
            <span className="text-app-primary font-mono text-sm uppercase">Transmitting...</span>
            <PlatformAvatar platform={activeSpeaker} size="sm" />
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-4 relative scroll-smooth">
        {messages.map((msg, index) => (
          <MessageCard 
            key={msg.id} 
            message={msg} 
            isLast={index === messages.length - 1 && gameState === 'running'} 
          />
        ))}
        <div ref={bottomRef} />
        
        {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-gray-500 font-mono">
                [WAITING FOR SIGNAL...]
            </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex-shrink-0 mt-6 pt-4 border-t border-app-border/30 flex justify-center gap-4">
        {gameState === 'running' ? (
          <button onClick={stopGame} className="btn-control bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white">
            <StopCircle className="w-6 h-6" />
          </button>
        ) : (
          <button onClick={startGame} className="btn-control bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500 hover:text-white">
            <Play className="w-6 h-6" />
          </button>
        )}
        
        <button onClick={handleStop} className="btn-control bg-gray-800 text-gray-400 hover:bg-white hover:text-black">
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>

      {/* Floating Analysis Button */}
      <AnimatePresence>
        {gameState === 'stopped' && messages.length > 0 && !showAnalysis && (
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={handleAnalyze}
                className="absolute bottom-24 right-4 z-50 bg-app-primary text-black font-display font-bold py-3 px-6 rounded-full shadow-[0_0_20px_#00F0FF] hover:scale-110 transition-transform flex items-center gap-2 animate-bounce"
            >
                <UserSearch size={20} />
                CLICK!
            </motion.button>
        )}
      </AnimatePresence>

      {/* Analysis Modal */}
      <AnimatePresence>
        {showAnalysis && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-app-panel border border-app-border rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.2)]"
                >
                    <div className="flex items-center justify-between p-6 border-b border-app-border/50 bg-app-bg/50">
                        <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                            <UserSearch className="text-app-primary" />
                            Personality Profile Analysis
                        </h2>
                        <button onClick={() => setShowAnalysis(false)} className="text-gray-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        {isAnalyzing ? (
                            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                <div className="w-16 h-16 border-4 border-app-primary border-t-transparent rounded-full animate-spin" />
                                <p className="font-mono text-app-primary animate-pulse">Analyzing rhetorical patterns...</p>
                            </div>
                        ) : analysisResult ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(analysisResult).map(([platform, data]: [string, any]) => (
                                    <div key={platform} className="bg-black/30 border border-app-border rounded-lg p-5 hover:border-app-primary/50 transition-colors">
                                        <div className="flex items-center gap-3 mb-4 border-b border-app-border/30 pb-3">
                                            {/* We try to map platform name back to ID for avatar if possible, or just use name */}
                                            <h3 className="font-display text-xl font-bold text-white">{platform}</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider block mb-1">Archetype</span>
                                                <p className="text-app-secondary font-bold text-lg">{data.persona}</p>
                                            </div>
                                            
                                            <div>
                                                <span className="text-xs font-mono text-gray-500 uppercase tracking-wider block mb-1">Analysis</span>
                                                <p className="text-gray-300 text-sm leading-relaxed">{data.analysis}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-red-400 font-mono">Analysis failed. Please try again.</div>
                        )}
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};
