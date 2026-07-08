export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  createdAt: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  execute: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface Connector {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
  parameters: {
    type: string;
    properties: Record<string, {
      type: string;
      description: string;
    }>;
    required?: string[];
  };
}

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  tools: Tool[];
  status: 'connected' | 'disconnected' | 'error';
}

export interface Artifact {
  id: string;
  type: 'code' | 'html' | 'svg' | 'document' | 'image';
  title: string;
  content: string;
  language?: string;
  imageUrl?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  artifacts: Artifact[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  folder?: string;
  forkedFrom?: string;
}

export interface MemoryEntry {
  key: string;
  value: string;
  timestamp: number;
}

export type ChatMode = 'fast' | 'balanced' | 'creative' | 'precise' | 'research';

export interface Settings {
  systemPrompt: string;
  theme: 'system' | 'light' | 'dark';
  fontSize: 'sm' | 'md' | 'lg';
  soundEnabled: boolean;
  streamEnabled: boolean;
  showToolCalls: boolean;
  customName: string;
  defaultMode: ChatMode;
  temperature: number;
  enableArtifacts: boolean;
  enableIris: boolean;
  enableWebSearch: boolean;
  enableMemory: boolean;
  customInstructions: string;
}

export interface ChatModeConfig {
  id: ChatMode;
  label: string;
  description: string;
  temperature: number;
  systemSuffix: string;
}

export const CHAT_MODES: ChatModeConfig[] = [
  { id: 'fast', label: 'Fast', description: 'Quick answers, no tools', temperature: 0.4, systemSuffix: 'Respond concisely. Skip tools unless absolutely necessary.' },
  { id: 'balanced', label: 'Balanced', description: 'Default — tools when helpful', temperature: 0.7, systemSuffix: 'Use tools when they would improve the answer.' },
  { id: 'creative', label: 'Creative', description: 'Longer, more imaginative', temperature: 1.0, systemSuffix: 'Be imaginative and exploratory. Longer, richer responses.' },
  { id: 'precise', label: 'Precise', description: 'Factual, careful', temperature: 0.2, systemSuffix: 'Be precise and factual. Cite sources via web_search when possible.' },
  { id: 'research', label: 'Research', description: 'Deep multi-step research', temperature: 0.5, systemSuffix: 'Conduct thorough research: call web_search and fetch_url multiple times. Synthesize findings with citations.' },
];

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'tool-calling' | 'error';
