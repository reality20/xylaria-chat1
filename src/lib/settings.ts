import type { Settings, MemoryEntry } from '@/types';

const SETTINGS_KEY = 'xylaria-settings';
const MEMORY_KEY = 'xylaria-memory';

export const DEFAULT_SETTINGS: Settings = {
  systemPrompt: `You are Xylaria, a powerful AI assistant. You have access to tools via structured JSON. When you need to use a tool, output ONLY a JSON block like:

{ "tool": "tool_name", "params": { "param1": "value1" } }

Available tools and their parameters:
{tools}

After tool results are provided, continue with your response incorporating the results naturally.

For creating artifacts (code, HTML, SVG), output:
{ "artifact": { "type": "code|html|svg", "title": "name", "content": "...", "language": "js|python|..." } }

Current date: {date}. Be helpful, accurate, and thorough.`,
  theme: 'system',
  fontSize: 'md',
  soundEnabled: false,
  streamEnabled: true,
  showToolCalls: true,
  customName: 'Xylaria',
};

export function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Memory system
export function loadMemories(): MemoryEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    return Object.entries(data).map(([key, val]) => {
      const v = val as { value: string; timestamp: number };
      return { key, value: v.value, timestamp: v.timestamp };
    }).sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function saveMemory(key: string, value: string) {
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    data[key] = { value, timestamp: Date.now() };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function deleteMemory(key: string) {
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    delete data[key];
    localStorage.setItem(MEMORY_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function clearMemories() {
  localStorage.removeItem(MEMORY_KEY);
}

export function exportData(): string {
  const data = {
    chats: localStorage.getItem('xylaria-chats-v2'),
    settings: localStorage.getItem(SETTINGS_KEY),
    memory: localStorage.getItem(MEMORY_KEY),
    connectors: localStorage.getItem('xylaria-connectors'),
    mcpServers: localStorage.getItem('xylaria-mcp-servers'),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(json: string) {
  const data = JSON.parse(json);
  if (data.chats) localStorage.setItem('xylaria-chats-v2', data.chats);
  if (data.settings) localStorage.setItem(SETTINGS_KEY, data.settings);
  if (data.memory) localStorage.setItem(MEMORY_KEY, data.memory);
  if (data.connectors) localStorage.setItem('xylaria-connectors', data.connectors);
  if (data.mcpServers) localStorage.setItem('xylaria-mcp-servers', data.mcpServers);
}
