'use client';

import { useState, useCallback, useEffect } from 'react';
import { MenuIcon, TerminalIcon, Settings2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentChat } from '@/hooks/use-agent-chat';
import { Sidebar } from './sidebar';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { ToolCallDisplay } from './tool-call-display';
import { ArtifactViewer } from './artifact-viewer';
import { SettingsModal } from './settings-modal';
import type { Artifact } from '@/types';

export function ChatInterface() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const {
    messages, input, setInput, status, error, sendMessage, stop, regenerate,
    chats, currentChat, createNewChat, selectChat, deleteChat, clearAllChats,
    currentArtifact, setCurrentArtifact, isArtifactOpen, setIsArtifactOpen,
    isSettingsOpen, setIsSettingsOpen, settings, updateSettings,
    connectors, refreshConnectors, mcpServers, refreshMCP,
    activeToolCalls, toolCallHistory, memories, clearAllMemories, allTools,
  } = useAgentChat();

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

  const openArtifact = useCallback((code: string, lang?: string) => {
    const a: Artifact = { id: crypto.randomUUID(), type: lang === 'html' ? 'html' : lang === 'svg' ? 'svg' : 'code', title: `${lang || 'code'} artifact`, content: code, language: lang || 'javascript' };
    setCurrentArtifact(a);
    setIsArtifactOpen(true);
  }, [setCurrentArtifact, setIsArtifactOpen]);

  return (
    <div className="flex w-full overflow-hidden bg-background" style={{ height: viewportHeight }}>
      {/* Sidebar */}
      <Sidebar
        chats={chats} currentId={currentChat?.id || null}
        onSelect={selectChat} onNew={createNewChat} onDelete={deleteChat} onClear={clearAllChats}
        onSettings={() => setIsSettingsOpen(true)} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border/50 bg-background/95 backdrop-blur-sm px-4 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground', sidebarOpen && 'md:hidden')}>
            <MenuIcon className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img src="/xylaria-logo.png" alt="" className="h-5 w-5 rounded-md object-contain" />
            <h1 className="text-[13px] font-semibold truncate">{settings.customName || 'Xylaria'}</h1>
          </div>
          <div className="ml-auto flex items-center gap-1 shrink-0">
            <span className="hidden sm:inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
              xylaria-2-senoa-max
            </span>
            <button onClick={() => openArtifact('', 'javascript')} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="JS Sandbox">
              <TerminalIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className={cn('flex h-7 w-7 items-center justify-center rounded-lg transition-colors', isSettingsOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')} title="Settings">
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
          <MessageList messages={messages} status={status} onRegenerate={regenerate} onOpenArtifact={openArtifact} />
          <ChatInput input={input} onInputChange={setInput} onSend={() => sendMessage()} onStop={stop} status={status} />
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
      </div>

      {/* Artifact Viewer - slides in from right */}
      {isArtifactOpen && (
        <ArtifactViewer artifact={currentArtifact} isOpen={isArtifactOpen} onClose={() => { setIsArtifactOpen(false); setCurrentArtifact(null); }} />
      )}
    </div>
  );
}
