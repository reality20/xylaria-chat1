'use client';

import { useState } from 'react';
import { MessageSquareIcon, PanelLeftIcon, PenSquareIcon, TrashIcon, XIcon, SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  chats: Chat[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onSettings: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ chats, currentId, onSelect, onNew, onDelete, onClear, onSettings, isOpen, onToggle }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showClear, setShowClear] = useState(false);
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden" onClick={onToggle} />}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        isOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/xylaria-logo.png" alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain shadow-sm" />
            <span className={cn('whitespace-nowrap text-[15px] font-semibold transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>Xylaria</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isOpen && (
              <>
                <button onClick={onNew} className="rounded-lg p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" title="New Chat">
                  <PenSquareIcon className="h-4 w-4" />
                </button>
                <button onClick={onToggle} className="rounded-lg p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors md:hidden">
                  <XIcon className="h-4 w-4" />
                </button>
              </>
            )}
            {!isOpen && (
              <button onClick={onToggle} className="hidden md:flex rounded-lg p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors" title="Open sidebar">
                <PanelLeftIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* New Chat */}
        <div className="px-3 pb-2">
          <button onClick={onNew} className={cn('flex w-full items-center gap-2 rounded-xl border border-sidebar-border/60 px-3 py-2 text-[13px] text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent/60 hover:text-sidebar-foreground hover:shadow-sm', !isOpen && 'md:justify-center md:px-0')}>
            <PenSquareIcon className="h-4 w-4 shrink-0" />
            <span className={cn('whitespace-nowrap font-medium transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>New chat</span>
          </button>
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-0.5 py-1">
            {sorted.length === 0 ? (
              <div className={cn('py-6 text-center text-[11px] text-sidebar-foreground/30', !isOpen && 'md:hidden')}>
                {isOpen && 'No chats yet'}
              </div>
            ) : (
              sorted.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    'group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-all',
                    currentId === c.id ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm' : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
                    !isOpen && 'md:justify-center md:px-0'
                  )}
                >
                  <MessageSquareIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className={cn('flex-1 truncate transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>{c.title}</span>
                  {isOpen && hovered === c.id && (
                    <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="shrink-0 rounded p-0.5 text-sidebar-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-3 py-2 space-y-1">
          <button onClick={onSettings} className={cn('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-sidebar-foreground/50 transition-all hover:bg-sidebar-accent/40 hover:text-sidebar-foreground', !isOpen && 'md:justify-center md:px-0')}>
            <SettingsIcon className="h-4 w-4 shrink-0" />
            <span className={cn('whitespace-nowrap transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>Settings</span>
          </button>
          {sorted.length > 0 && (
            <button onClick={() => setShowClear(true)} className={cn('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-sidebar-foreground/40 transition-all hover:bg-destructive/10 hover:text-destructive', !isOpen && 'md:justify-center md:px-0')}>
              <TrashIcon className="h-4 w-4" />
              <span className={cn('whitespace-nowrap transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>Delete all</span>
            </button>
          )}
        </div>
      </aside>

      {/* Clear Confirm */}
      {showClear && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setShowClear(false)}>
          <div className="rounded-xl border border-border bg-background p-5 shadow-xl max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-sm mb-1">Delete all chats?</h4>
            <p className="text-[12px] text-muted-foreground mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClear(false)} className="rounded-lg border border-border px-3 py-1.5 text-[12px] hover:bg-accent transition-colors">Cancel</button>
              <button onClick={() => { onClear(); setShowClear(false); }} className="rounded-lg bg-destructive px-3 py-1.5 text-[12px] text-destructive-foreground hover:bg-destructive/90 transition-colors">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
