'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  MenuIcon, TerminalIcon, Settings2Icon, ShareIcon, CommandIcon,
  SunIcon, MoonIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentChat } from '@/hooks/use-agent-chat';
import { Sidebar } from './sidebar';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { ToolCallDisplay } from './tool-call-display';
import { ArtifactViewer } from './artifact-viewer';
import { SettingsModal } from './settings-modal';
import { CommandPalette } from './command-palette';
import { ShareModal } from './share-modal';
import type { Artifact } from '@/types';

export function ChatInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const {
    messages, input, setInput, status, error, sendMessage, stop, regenerate, editUserMessage,
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
  } = useAgentChat();

  // Detect mobile and auto-collapse sidebar on small screens.
  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 768;
      setIsMobile(m);
      if (m) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [viewportHeight, setViewportHeight] = useState<number | string>('100dvh');

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  // Global keyboard shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd/Ctrl+K → command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      // Cmd/Ctrl+/ → toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
      // Cmd/Ctrl+B → toggle sidebar (alt)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
      // Cmd/Ctrl+, → settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      // Cmd/Ctrl+J → new chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        createNewChat();
      }
      // Esc → close artifact
      if (e.key === 'Escape' && isArtifactOpen) {
        setIsArtifactOpen(false);
        setCurrentArtifact(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setIsCommandPaletteOpen, setIsSettingsOpen, createNewChat, isArtifactOpen, setIsArtifactOpen, setCurrentArtifact]);

  // Listen for suggestion-click events from the empty-state component.
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      setInput(text);
    };
    window.addEventListener('xylaria-use-suggestion', handler);
    return () => window.removeEventListener('xylaria-use-suggestion', handler);
  }, [setInput]);

  const openArtifact = useCallback((code: string, lang?: string) => {
    const a: Artifact = {
      id: crypto.randomUUID(),
      type: lang === 'html' ? 'html' : lang === 'svg' ? 'svg' : 'code',
      title: `${lang || 'code'} artifact`,
      content: code,
      language: lang || 'javascript',
    };
    setCurrentArtifact(a);
    setIsArtifactOpen(true);
  }, [setCurrentArtifact, setIsArtifactOpen]);

  const handleUsePrompt = useCallback((text: string) => {
    setInput(text);
    if (isMobile) setSidebarOpen(false);
  }, [setInput, isMobile]);

  const handleForkFromMessage = useCallback((msgId: string) => {
    if (currentChat) forkChat(currentChat.id, msgId);
  }, [currentChat, forkChat]);

  const handleAttachFiles = useCallback((files: File[]) => {
    // For now: append filenames to the input so the AI is aware.
    // (A full implementation would read file contents and include them in the next message.)
    const names = files.map((f) => f.name).join(', ');
    setInput((prev: string) => prev + (prev ? '\n' : '') + `[Attached: ${names}]`);
  }, [setInput]);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  };

  return (
    <div className="flex w-full overflow-hidden bg-background" style={{ height: viewportHeight }}>
      {/* Sidebar */}
      <Sidebar
        chats={chats} currentId={currentChat?.id || null}
        onSelect={(id) => { selectChat(id); if (isMobile) setSidebarOpen(false); }}
        onNew={() => { createNewChat(); if (isMobile) setSidebarOpen(false); }}
        onDelete={deleteChat} onClear={clearAllChats}
        onSettings={() => setIsSettingsOpen(true)}
        onTogglePin={togglePinChat} onRename={renameChat}
        onFork={(id) => forkChat(id)} onExport={exportChatMarkdown}
        onUsePrompt={handleUsePrompt}
        isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main */}
      <div className="relative flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex h-11 shrink-0 items-center gap-2 sm:gap-3 border-b border-border/50 bg-background/95 backdrop-blur-sm px-3 sm:px-4 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground', sidebarOpen && 'md:hidden')}>
            <MenuIcon className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img src="/xylaria-logo.png" alt="" className="h-5 w-5 rounded-md object-contain" />
            <h1 className="text-[13px] font-semibold truncate">{currentChat?.title || (settings.customName || 'Xylaria')}</h1>
          </div>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 shrink-0">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Command palette (⌘K)"
            >
              <CommandIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => { if (currentChat) setIsShareOpen(true); }}
              disabled={!currentChat}
              className={cn('flex h-7 w-7 items-center justify-center rounded-lg transition-colors', currentChat ? 'text-muted-foreground hover:bg-accent hover:text-foreground' : 'text-muted-foreground/30 cursor-not-allowed')}
              title="Share / export chat"
            >
              <ShareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Toggle theme"
            >
              {settings.theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </button>
            <button onClick={() => openArtifact('', 'javascript')} className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="JS Sandbox">
              <TerminalIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className={cn('flex h-7 w-7 items-center justify-center rounded-lg transition-colors', isSettingsOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')} title="Settings (⌘,)">
              <Settings2Icon className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 z-10">
            <div className="mx-auto flex max-w-3xl items-center justify-between">
              <p className="text-[13px] text-destructive">{error}</p>
              <button onClick={() => window.location.reload()} className="rounded-md bg-destructive/20 px-2.5 py-1 text-[11px] text-destructive hover:bg-destructive/30 transition-colors">Retry</button>
            </div>
          </div>
        )}

        {/* Tool calls */}
        <ToolCallDisplay active={activeToolCalls} history={toolCallHistory} visible={settings.showToolCalls} />

        {/* Messages + Input */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <MessageList
            messages={messages} status={status}
            onRegenerate={regenerate} onOpenArtifact={openArtifact}
            onEditUserMessage={editUserMessage} onFork={handleForkFromMessage}
          />
          <ChatInput
            input={input} onInputChange={setInput} onSend={() => sendMessage()}
            onStop={stop} status={status}
            mode={mode} onModeChange={setMode}
            onAttachFiles={handleAttachFiles}
          />
        </div>

        {/* Settings Modal */}
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
            settings={settings} onUpdate={updateSettings}
            connectors={connectors} onRefreshConnectors={refreshConnectors}
            mcpServers={mcpServers} onRefreshMCP={refreshMCP}
            memories={memories} onClearMemories={clearAllMemories}
            tools={allTools}
          />
        )}

        {/* Command Palette */}
        {isCommandPaletteOpen && (
          <CommandPalette
            onClose={() => setIsCommandPaletteOpen(false)}
            onNewChat={() => { createNewChat(); setIsCommandPaletteOpen(false); }}
            onToggleSidebar={() => { setSidebarOpen((v) => !v); setIsCommandPaletteOpen(false); }}
            onOpenSettings={() => { setIsSettingsOpen(true); setIsCommandPaletteOpen(false); }}
            onOpenShare={() => { if (currentChat) setIsShareOpen(true); setIsCommandPaletteOpen(false); }}
            onSelectChat={(id) => { selectChat(id); setIsCommandPaletteOpen(false); }}
            chats={chats}
            onSetInput={(t) => { setInput(t); setIsCommandPaletteOpen(false); }}
          />
        )}

        {/* Share Modal */}
        {isShareOpen && currentChat && (
          <ShareModal
            chat={currentChat}
            markdown={exportChatMarkdown(currentChat.id)}
            onClose={() => setIsShareOpen(false)}
          />
        )}
      </div>

      {/* Artifact Viewer - slides in from right */}
      {isArtifactOpen && (
        <ArtifactViewer artifact={currentArtifact} isOpen={isArtifactOpen} onClose={() => { setIsArtifactOpen(false); setCurrentArtifact(null); }} />
      )}
    </div>
  );
}
