import { useEffect, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import type { ServerMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const useGameSocket = () => {
  const { serverUrl, apiKey } = useSettingsStore();
  const { 
    topic, 
    selectedPlatforms,
    maxRounds, 
    setGameState, 
    addMessage, 
    updateLastMessage,
    setActiveSpeaker,
    setCurrentRound,
    messages
  } = useGameStore();

  const { sendMessage, lastMessage, readyState } = useWebSocket(serverUrl, {
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  // Handle incoming messages
  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data: ServerMessage = JSON.parse(lastMessage.data);
        handleServerMessage(data);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    }
  }, [lastMessage]);

  const handleServerMessage = (data: ServerMessage) => {
    switch (data.type) {
      case 'system':
        console.log("System:", data.content);
        break;
      
      case 'turn_start':
        setActiveSpeaker(data.platform || null);
        if (data.round) setCurrentRound(data.round);
        // Create a new empty message entry for streaming
        addMessage({
          id: uuidv4(),
          speaker: data.name || 'Unknown',
          platform: data.platform!,
          content: '',
          timestamp: Date.now(),
          round: data.round || 1,
          isFragment: true
        });
        break;

      case 'fragment':
        // Append content to the last message
        // Ideally we should match by ID, but since it's sequential, last message is fine for MVP
        updateLastMessage((messages[messages.length - 1]?.content || '') + (data.content || ''));
        break;

      case 'turn_end':
        // Finalize the message content
        if (data.full_content) {
             // Overwrite with full content to ensure integrity
             // We need a way to update specific message, but `updateLastMessage` works for now
             // as long as we are strictly sequential.
        }
        setActiveSpeaker(null);
        break;
        
      case 'info':
        console.log("Info:", data.content);
        if (data.content === "Max rounds reached. Debate finished.") {
          setGameState('stopped');
        }
        break;
        
      case 'error':
        console.error("Server Error:", data.content);
        setGameState('stopped');
        break;
    }
  };

  const startGame = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({
        action: 'start',
        payload: {
          topic,
          platforms: selectedPlatforms,
          api_key: apiKey,
          max_rounds: maxRounds
        }
      }));
      setGameState('running');
    }
  }, [readyState, topic, selectedPlatforms, apiKey, maxRounds, sendMessage]);

  const stopGame = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      sendMessage(JSON.stringify({ action: 'stop' }));
      setGameState('stopped');
    }
  }, [readyState, sendMessage]);

  return {
    startGame,
    stopGame,
    isConnected: readyState === ReadyState.OPEN
  };
};
