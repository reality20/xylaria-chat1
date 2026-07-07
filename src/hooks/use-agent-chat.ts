import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, Chat, ChatStatus, Artifact, Connector, MCPServer, Tool } from '@/types';
import { generateId, generateTitleFromMessage, getSystemPromptWithDate } from '@/lib/utils';
import { useLocalStorage } from './use-local-storage';
import { BUILTIN_TOOLS } from '@/lib/tools/builtins';
import { buildToolsDescription, parseAgentResponse, stripJsonForDisplay, executeToolCall, formatToolResult } from '@/lib/tools/registry';
import { loadConnectors, connectorsToTools } from '@/lib/connectors/registry';
import { loadMCPServers, connectMCPServer, saveMCPServers } from '@/lib/mcp/client';
import { loadSettings, saveSettings, loadMemories, saveMemory, deleteMemory, clearMemories } from '@/lib/settings';
import type { Settings } from '@/types';

const API_URL = 'https://xylaria2s.vercel.app/api/v1/chat/completions';
const MODEL = 'xylaria-2-senoa-max';
const MAX_ITERATIONS = 8;

export function useAgentChat() {
  const [chats, setChats] = useLocalStorage<Chat[]>('xylaria-chats-v3', []);
  const [currentChatId, setCurrentChatId] = useLocalStorage<string | null>('xylaria-current-v3', null);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettingsState] = useState<Settings>(loadSettings());
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeToolCalls, setActiveToolCalls] = useState<Array<{ name: string; status: 'running' | 'done' | 'error'; duration?: number }>>([]);
  const [toolCallHistory, setToolCallHistory] = useState<Array<{ name: string; input: string; output: string; error: string | null }>>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Load connectors/MCP on mount
  useEffect(() => {
    setConnectors(loadConnectors());
    const servers = loadMCPServers();
    setMcpServers(servers);
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') root.classList.add('dark');
    else if (settings.theme === 'light') root.classList.remove('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
    }
  }, [settings.theme]);

  const allTools: Tool[] = [
    ...BUILTIN_TOOLS,
    ...connectorsToTools(connectors),
    ...mcpServers.flatMap((s) => s.tools),
  ];

  const currentChat = chats.find((c) => c.id === currentChatId) || null;

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettingsState((prev: Settings) => { const next = { ...prev, ...partial }; saveSettings(next); return next; });
  }, []);

  const createNewChat = useCallback(() => { setCurrentChatId(null); setInput(''); setStatus('idle'); setError(null); setCurrentArtifact(null); }, [setCurrentChatId]);
  const selectChat = useCallback((id: string) => { setCurrentChatId(id); setInput(''); setStatus('idle'); setError(null); }, [setCurrentChatId]);
  const deleteChat = useCallback((id: string) => { setChats((p) => p.filter((c) => c.id !== id)); if (currentChatId === id) setCurrentChatId(null); }, [setChats, currentChatId, setCurrentChatId]);
  const clearAllChats = useCallback(() => { setChats([]); setCurrentChatId(null); }, [setChats, setCurrentChatId]);
  const stop = useCallback(() => { abortRef.current?.abort(); abortRef.current = null; setStatus('idle'); setActiveToolCalls([]); }, []);

  // Core streaming with tool calling loop
  const streamResponse = useCallback(async (initialMessages: Message[], chatId: string) => {
    const toolsDesc = buildToolsDescription(allTools);
    const systemPrompt = getSystemPromptWithDate(settings.systemPrompt.replace('{tools}', toolsDesc));
    let iteration = 0;

    const currentMessages = [...initialMessages];

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      let fullContent = '';
      const assistantId = generateId();

      const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() };

      setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, messages: [...currentMessages, assistantMsg], updatedAt: Date.now() } : c));

      const conversation = currentMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const apiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversation,
      ];

      const concatenated = apiMessages.map((m) => {
        const label = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : m.role === 'tool' ? 'Tool' : 'System';
        return `[${label}]: ${m.content}`;
      }).join('\n\n');

      abortRef.current = new AbortController();

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: concatenated }], stream: true }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) { const t = await res.text().catch(() => 'Error'); throw new Error(`API ${res.status}: ${t}`); }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                const display = stripJsonForDisplay(fullContent);
                if (display) {
                  setChats((prev) => prev.map((c) => c.id === chatId ? {
                    ...c, messages: c.messages.map((m) => m.id === assistantId ? { ...m, content: display } : m), updatedAt: Date.now(),
                  } : c));
                }
              }
            } catch { /* skip invalid */ }
          }
        }
      } finally { reader.releaseLock(); }

      // Parse tool calls and artifacts
      const { cleanText, toolCalls, artifacts } = parseAgentResponse(fullContent);

      // Update with clean text
      if (cleanText) {
        setChats((prev) => prev.map((c) => c.id === chatId ? {
          ...c, messages: c.messages.map((m) => m.id === assistantId ? { ...m, content: cleanText } : m), updatedAt: Date.now(),
        } : c));
      }

      assistantMsg.content = fullContent;
      assistantMsg.tool_calls = toolCalls;
      currentMessages.push(assistantMsg);

      // Save artifacts
      if (artifacts.length > 0) {
        const newArtifacts: Artifact[] = artifacts.map((a) => ({ ...a, id: generateId() }));
        setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, artifacts: [...c.artifacts, ...newArtifacts], updatedAt: Date.now() } : c));
        // Open first artifact
        if (newArtifacts[0]) { setCurrentArtifact(newArtifacts[0]); setIsArtifactOpen(true); }
      }

      // If no tool calls, done
      if (toolCalls.length === 0) break;

      // Execute tool calls
      setStatus('tool-calling');

      for (const tc of toolCalls) {
        setActiveToolCalls((prev) => [...prev, { name: tc.name, status: 'running' }]);
        const { result, error: toolError, duration } = await executeToolCall(tc, allTools);
        const resultStr = formatToolResult(tc.name, result, toolError);

        setActiveToolCalls((prev) => prev.map((a) => a.name === tc.name && a.status === 'running' ? { ...a, status: toolError ? 'error' : 'done', duration } : a));
        setToolCallHistory((prev) => [...prev, { name: tc.name, input: JSON.stringify(tc.arguments), output: resultStr, error: toolError }]);

        const toolMsg: Message = {
          id: generateId(), role: 'tool', content: `[Tool: ${tc.name}] Result (${duration}ms):\n${resultStr}`,
          tool_call_id: tc.id, createdAt: Date.now(),
        };
        currentMessages.push(toolMsg);
        setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, messages: [...c.messages, toolMsg], updatedAt: Date.now() } : c));
      }

      setStatus('streaming');
    }

  }, [allTools, settings.systemPrompt, setChats]);

  const sendMessage = useCallback(async (content?: string) => {
    const msg = content || input;
    if (!msg.trim() || status === 'streaming' || status === 'tool-calling') return;

    setError(null);
    setStatus('submitted');
    setActiveToolCalls([]);
    setToolCallHistory([]);

    const userMsg: Message = { id: generateId(), role: 'user', content: msg.trim(), createdAt: Date.now() };

    let chatId = currentChatId;
    if (!chatId) {
      chatId = generateId();
      setChats((p) => [{ id: chatId!, title: generateTitleFromMessage(userMsg.content), messages: [userMsg], artifacts: [], createdAt: Date.now(), updatedAt: Date.now() }, ...p]);
      setCurrentChatId(chatId);
    } else {
      setChats((p) => p.map((c) => c.id === chatId ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() } : c));
    }

    setInput('');
    setStatus('streaming');

    try {
      const msgs = currentChat ? [...currentChat.messages, userMsg] : [userMsg];
      await streamResponse(msgs, chatId!);
      setStatus('idle');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') setStatus('idle');
      else { setError(err instanceof Error ? err.message : 'Error'); setStatus('error'); }
    } finally {
      abortRef.current = null;
      setActiveToolCalls([]);
    }
  }, [input, status, currentChatId, currentChat, setChats, setCurrentChatId, streamResponse]);

  const regenerate = useCallback(async (msgId: string) => {
    if (!currentChat) return;
    const idx = currentChat.messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const prev = currentChat.messages.slice(0, idx);
    setChats((p) => p.map((c) => c.id === currentChat.id ? { ...c, messages: [...prev], updatedAt: Date.now() } : c));
    setError(null); setStatus('streaming'); setActiveToolCalls([]); setToolCallHistory([]);
    try {
      await streamResponse([...prev], currentChat.id);
      setStatus('idle');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') setStatus('idle');
      else { setError(err instanceof Error ? err.message : 'Error'); setStatus('error'); }
    } finally { abortRef.current = null; setActiveToolCalls([]); }
  }, [currentChat, streamResponse, setChats]);

  // Refresh functions
  const refreshConnectors = useCallback(() => setConnectors(loadConnectors()), []);
  const refreshMCP = useCallback(async () => {
    const servers = loadMCPServers();
    const updated = await Promise.all(servers.map(async (s) => {
      try { s.tools = await connectMCPServer(s); s.status = s.tools.length > 0 ? 'connected' : 'error'; } catch { s.status = 'error'; }
      return s;
    }));
    setMcpServers(updated);
    saveMCPServers(updated);
  }, []);

  // Memory functions
  const memories = loadMemories();
  const addMemory = useCallback((key: string, value: string) => saveMemory(key, value), []);
  const removeMemory = useCallback((key: string) => deleteMemory(key), []);
  const clearAllMemories = useCallback(() => clearMemories(), []);

  return {
    messages: currentChat?.messages || [],
    input, setInput,
    status, error,
    sendMessage, stop, regenerate,
    chats, currentChat,
    createNewChat, selectChat, deleteChat, clearAllChats,
    currentArtifact, setCurrentArtifact,
    isArtifactOpen, setIsArtifactOpen,
    isSettingsOpen, setIsSettingsOpen,
    settings, updateSettings,
    connectors, refreshConnectors,
    mcpServers, refreshMCP,
    activeToolCalls,
    toolCallHistory,
    memories,
    addMemory, removeMemory, clearAllMemories,
    allTools,
  };
}
