import { create } from 'zustand';
import type { DialogueEntry, GameState, Platform } from '../types';

interface GameStore {
  gameState: GameState;
  messages: DialogueEntry[];
  currentRound: number;
  activeSpeaker: Platform | null;
  topic: string;
  selectedPlatforms: Platform[];
  maxRounds: number;
  
  // Actions
  setGameState: (state: GameState) => void;
  setTopic: (topic: string) => void;
  setSelectedPlatforms: (platforms: Platform[]) => void;
  setMaxRounds: (rounds: number) => void;
  addMessage: (message: DialogueEntry) => void;
  updateLastMessage: (content: string) => void;
  setActiveSpeaker: (platform: Platform | null) => void;
  setCurrentRound: (round: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: 'idle',
  messages: [],
  currentRound: 0,
  activeSpeaker: null,
  topic: '',
  selectedPlatforms: ['bilibili', 'zhihu'], // Default
  maxRounds: 3,

  setGameState: (state) => set({ gameState: state }),
  setTopic: (topic) => set({ topic }),
  setSelectedPlatforms: (platforms) => set({ selectedPlatforms: platforms }),
  setMaxRounds: (rounds) => set({ maxRounds: rounds }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  
  updateLastMessage: (content) => set((state) => {
    const newMessages = [...state.messages];
    if (newMessages.length > 0) {
      newMessages[newMessages.length - 1].content = content;
    }
    return { messages: newMessages };
  }),
  
  setActiveSpeaker: (platform) => set({ activeSpeaker: platform }),
  setCurrentRound: (round) => set({ currentRound: round }),
  
  resetGame: () => set({
    gameState: 'idle',
    messages: [],
    currentRound: 0,
    activeSpeaker: null
  })
}));
