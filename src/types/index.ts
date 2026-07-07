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
  type: 'code' | 'html' | 'svg' | 'document';
  title: string;
  content: string;
  language?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  artifacts: Artifact[];
  createdAt: number;
  updatedAt: number;
}

export interface MemoryEntry {
  key: string;
  value: string;
  timestamp: number;
}

export interface Settings {
  systemPrompt: string;
  theme: 'system' | 'light' | 'dark';
  fontSize: 'sm' | 'md' | 'lg';
  soundEnabled: boolean;
  streamEnabled: boolean;
  showToolCalls: boolean;
  customName: string;
}

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'tool-calling' | 'error';
