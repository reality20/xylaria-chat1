import { useState, useCallback, useEffect, useRef } from 'react';
import type { Chat, Message, Settings, Artifact, ChatMode, MemoryEntry, Connector, MCPServer, Tool } from '@/types';
import { CHAT_MODES } from '@/types';

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  customName: 'Xylaria',
  apiKey: '',
  apiBaseUrl: '',
  model: '',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 4096,
  showToolCalls: false,
  streamResponses: true,
  fontSize: 'md',
  customInstructions: '',
  streamEnabled: true,
  soundEnabled: false,
  defaultMode: 'balanced',
  enableArtifacts: true,
  enableIris: true,
  enableWebSearch: true,
  enableMemory: true,
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

function saveToStorage(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function useAgentChat() {
  const [chats, setChats] = useState<Chat[]>(() => loadFromStorage('xylaria-chats', []));
  const [currentChatId, setCurrentChatId] = useState<string | null>(() => loadFromStorage('xylaria-current-chat', null));
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'tool-calling'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ChatMode>(() => loadFromStorage('xylaria-mode', 'balanced'));
  const [settings, setSettings] = useState<Settings>(() => loadFromStorage('xylaria-settings', DEFAULT_SETTINGS));
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<Array<{ name: string; status: 'running' | 'done' | 'error'; duration?: number }>>([]);
  const [toolCallHistory, setToolCallHistory] = useState<Array<{ name: string; input: string; output: string; error: string | null }>>([]);
  const [memories] = useState<MemoryEntry[]>([]);
  const [connectors] = useState<Connector[]>([]);
  const [mcpServers] = useState<MCPServer[]>([]);
  const [allTools] = useState<Tool[]>([]);

  const currentChat = chats.find((c) => c.id === currentChatId) || null;

  // Persist chats
  useEffect(() => { saveToStorage('xylaria-chats', chats); }, [chats]);
  useEffect(() => { saveToStorage('xylaria-current-chat', currentChatId); }, [currentChatId]);
  useEffect(() => { saveToStorage('xylaria-mode', mode); }, [mode]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [settings.theme]);

  const generateId = () => crypto.randomUUID();

  const createNewChat = useCallback(() => {
    const chat: Chat = {
      id: generateId(),
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    setChats((prev) => [chat, ...prev]);
    setCurrentChatId(chat.id);
    setInput('');
    setError(null);
  }, []);

  const selectChat = useCallback((id: string) => {
    setCurrentChatId(id);
    setInput('');
    setError(null);
  }, []);

  const deleteChat = useCallback((id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (currentChatId === id) setCurrentChatId(null);
  }, [currentChatId]);

  const clearAllChats = useCallback(() => {
    setChats([]);
    setCurrentChatId(null);
  }, []);

  const togglePinChat = useCallback((id: string) => {
    setChats((prev) => prev.map((c) => c.id === id ? { ...c, pinned: !c.pinned } : c));
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    setChats((prev) => prev.map((c) => c.id === id ? { ...c, title, updatedAt: Date.now() } : c));
  }, []);

  const forkChat = useCallback((chatId: string, fromMessageId?: string) => {
    const source = chats.find((c) => c.id === chatId);
    if (!source) return;
    let msgs = source.messages;
    if (fromMessageId) {
      const idx = msgs.findIndex((m) => m.id === fromMessageId);
      if (idx >= 0) msgs = msgs.slice(0, idx + 1);
    }
    const chat: Chat = {
      id: generateId(),
      title: source.title + ' (fork)',
      messages: msgs.map((m) => ({ ...m, id: generateId() })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    setChats((prev) => [chat, ...prev]);
    setCurrentChatId(chat.id);
  }, [chats]);

  const exportChatMarkdown = useCallback((chatId: string) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return '';
    return chat.messages.filter((m) => m.role !== 'tool').map((m) => `## ${m.role === 'user' ? 'You' : 'Xylaria'}\n\n${m.content}`).join('\n\n---\n\n');
  }, [chats]);

  const editUserMessage = useCallback((messageId: string, newContent: string) => {
    if (!currentChatId) return;
    setChats((prev) => prev.map((c) => {
      if (c.id !== currentChatId) return c;
      const idx = c.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return c;
      const newMsgs = c.messages.slice(0, idx);
      newMsgs.push({ ...c.messages[idx], content: newContent, createdAt: Date.now() });
      return { ...c, messages: newMsgs, updatedAt: Date.now() };
    }));
  }, [currentChatId]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const userMsg: Message = { id: generateId(), role: 'user', content: input.trim(), createdAt: Date.now() };
    const assistantMsg: Message = { id: generateId(), role: 'assistant', content: '', createdAt: Date.now() };

    let chatId = currentChatId;
    if (!chatId) {
      const chat: Chat = {
        id: generateId(), title: input.trim().slice(0, 60), messages: [],
        createdAt: Date.now(), updatedAt: Date.now(), pinned: false,
      };
      chatId = chat.id;
      setChats((prev) => [chat, ...prev]);
      setCurrentChatId(chatId);
    }

    setChats((prev) => prev.map((c) => {
      if (c.id !== chatId) return c;
      const msgs = [...c.messages, userMsg, assistantMsg];
      const title = c.messages.length === 0 ? input.trim().slice(0, 60) : c.title;
      return { ...c, messages: msgs, title, updatedAt: Date.now() };
    }));

    setInput('');
    setStatus('streaming');

    // Simulate streaming response
    const responses = [
      "I'd be happy to help with that! Let me think about this...\n\nHere's what I can tell you:\n\n**Key Points:**\n\n1. This is a demo response from Xylaria\n2. In a real setup, this would connect to an AI API\n3. The UI is fully functional with chat management\n\n> \"The best way to predict the future is to invent it.\" — Alan Kay\n\nFeel free to ask me anything else!",
      "That's a great question! Let me break it down for you.\n\n### Overview\n\nThe concept you're asking about involves several interconnected components:\n\n- **Component A**: Handles the core logic\n- **Component B**: Manages state and data flow\n- **Component C**: Provides the user interface layer\n\n```typescript\n// Example code\nfunction solve(input: string): string {\n  return input.split('').reverse().join('');\n}\n```\n\nWould you like me to elaborate on any of these points?",
      "Here's my analysis:\n\n| Aspect | Rating | Notes |\n|--------|--------|-------|\n| Performance | ⭐⭐⭐⭐ | Excellent throughput |\n| Usability | ⭐⭐⭐⭐⭐ | Very intuitive |\n| Reliability | ⭐⭐⭐⭐ | Solid architecture |\n\nThe results show strong performance across all metrics. Let me know if you need more details!",
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    let charIdx = 0;
    const streamInterval = setInterval(() => {
      charIdx += 3;
      if (charIdx >= response.length) {
        charIdx = response.length;
        clearInterval(streamInterval);
        setStatus('idle');
      }
      const partial = response.slice(0, charIdx);
      setChats((prev) => prev.map((c) => {
        if (c.id !== chatId) return c;
        return { ...c, messages: c.messages.map((m) => m.id === assistantMsg.id ? { ...m, content: partial } : m) };
      }));
    }, 15);
  }, [input, currentChatId]);

  const stop = useCallback(() => {
    setStatus('idle');
  }, []);

  const regenerate = useCallback((msgId: string) => {
    // Simple: just add a new assistant message after the given one
    if (!currentChatId) return;
    const newMsg: Message = { id: generateId(), role: 'assistant', content: 'Regenerated response would appear here. Connect to an AI API for real functionality.', createdAt: Date.now() };
    setChats((prev) => prev.map((c) => {
      if (c.id !== currentChatId) return c;
      const idx = c.messages.findIndex((m) => m.id === msgId);
      if (idx < 0) return c;
      const msgs = [...c.messages];
      msgs.splice(idx + 1, 0, newMsg);
      return { ...c, messages: msgs, updatedAt: Date.now() };
    }));
  }, [currentChatId]);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveToStorage('xylaria-settings', next);
      return next;
    });
  }, []);

  const refreshConnectors = useCallback(() => {}, []);
  const refreshMCP = useCallback(() => {}, []);
  const clearAllMemories = useCallback(() => {}, []);

  return {
    messages: currentChat?.messages || [],
    input, setInput, status, error, sendMessage, stop, regenerate, editUserMessage,
    chats, currentChat, createNewChat, selectChat, deleteChat, clearAllChats,
    togglePinChat, renameChat, forkChat, exportChatMarkdown,
    currentArtifact, setCurrentArtifact, isArtifactOpen, setIsArtifactOpen,
    isSettingsOpen, setIsSettingsOpen,
    isCommandPaletteOpen, setIsCommandPaletteOpen,
    isShareOpen, setIsShareOpen,
    settings, updateSettings,
    connectors, refreshConnectors, mcpServers, refreshMCP,
    activeToolCalls, toolCallHistory, memories, clearAllMemories, allTools,
    mode, setMode,
  };
}