export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: number;
  tool_calls?: Array<{ id: string; name: string; input: string; output?: string }>;
  images?: string[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
}

export type ChatMode = 'fast' | 'balanced' | 'creative' | 'precise' | 'research';

export interface ChatModeConfig {
  id: ChatMode;
  label: string;
  description: string;
  temperature?: number;
}

export const CHAT_MODES: ChatModeConfig[] = [
  { id: 'fast', label: 'Fast', description: 'Quick, concise responses', temperature: 0.3 },
  { id: 'balanced', label: 'Balanced', description: 'Good balance of speed and detail', temperature: 0.7 },
  { id: 'creative', label: 'Creative', description: 'More creative and expansive', temperature: 1.0 },
  { id: 'precise', label: 'Precise', description: 'High accuracy and detail', temperature: 0.2 },
  { id: 'research', label: 'Research', description: 'Deep analysis with citations', temperature: 0.4 },
];

export interface Artifact {
  id: string;
  type: 'code' | 'html' | 'svg' | 'image' | 'document';
  title: string;
  content: string;
  language: string;
  imageUrl?: string;
}

export type FontSize = 'sm' | 'md' | 'lg';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  customName: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  showToolCalls: boolean;
  streamResponses: boolean;
  fontSize: FontSize;
  customInstructions: string;
  streamEnabled: boolean;
  soundEnabled: boolean;
  defaultMode: ChatMode;
  enableArtifacts: boolean;
  enableIris: boolean;
  enableWebSearch: boolean;
  enableMemory: boolean;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  timestamp: number;
}

export interface Connector {
  id: string;
  name: string;
  type: string;
  description: string;
  url?: string;
  method?: string;
  parameters?: Record<string, unknown>;
}

export interface MCPServer {
  id: string;
  name: string;
  url?: string;
  command?: string;
  args?: string[];
  status: 'connected' | 'disconnected' | 'error';
  tools?: Tool[];
}

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}