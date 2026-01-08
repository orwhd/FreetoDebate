export type Platform = 'bilibili' | 'weibo' | 'zhihu';

export interface DialogueEntry {
  id: string;
  speaker: string; // Display name
  platform: Platform;
  content: string;
  timestamp: number;
  round: number;
  isFragment?: boolean; // True if this is a partial stream update
}

export interface DebateConfig {
  topic: string;
  platforms: Platform[];
  apiKey?: string;
  temperature?: number;
}

export type GameState = 'idle' | 'running' | 'paused' | 'stopped';

export interface ServerMessage {
  type: 'system' | 'turn_start' | 'fragment' | 'turn_end' | 'error' | 'info';
  platform?: Platform;
  content?: string;
  full_content?: string;
  timestamp?: number;
  round?: number;
  name?: string;
  platforms?: Platform[];
}
