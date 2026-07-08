'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  SearchIcon, PenSquareIcon, PanelLeftIcon, SettingsIcon, ShareIcon,
  MessageSquareIcon, SparklesIcon, ImageIcon, CodeIcon, BookOpenIcon, BrainIcon, Search as SearchLucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat } from '@/types';

interface Props {
  onClose: () => void;
  onNewChat: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onOpenShare: () => void;
  onSelectChat: (id: string) => void;
  onSetInput: (text: string) => void;
  chats: Chat[];
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  group: 'Actions' | 'Chats' | 'Prompts';
  keywords?: string;
}

const QUICK_PROMPTS = [
  { label: 'Generate an image', text: 'Generate an image: ', icon: ImageIcon },
  { label: 'Search the web', text: 'Search the web for: ', icon: SearchLucideIcon },
  { label: 'Write code', text: 'Write code: ', icon: CodeIcon },
  { label: 'Explain a concept', text: 'Explain in simple terms: ', icon: BrainIcon },
  { label: 'Research a topic', text: 'Research thoroughly: ', icon: BookOpenIcon },
  { label: 'Be creative', text: 'Write a creative piece about: ', icon: SparklesIcon },
];

export function CommandPalette({ onClose, onNewChat, onToggleSidebar, onOpenSettings, onOpenShare, onSelectChat, onSetInput, chats }: Props) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const items = useMemo<CommandItem[]>(() => {
    const actions: CommandItem[] = [
      { id: 'new', label: 'New chat', hint: '⌘J', icon: PenSquareIcon, action: onNewChat, group: 'Actions' },
      { id: 'toggle-sidebar', label: 'Toggle sidebar', hint: '⌘/', icon: PanelLeftIcon, action: onToggleSidebar, group: 'Actions' },
      { id: 'settings', label: 'Open settings', hint: '⌘,', icon: SettingsIcon, action: onOpenSettings, group: 'Actions' },
      { id: 'share', label: 'Share / export current chat', icon: ShareIcon, action: onOpenShare, group: 'Actions' },
    ];
    const prompts: CommandItem[] = QUICK_PROMPTS.map((p) => ({
      id: `prompt-${p.label}`,
      label: p.label,
      icon: p.icon,
      action: () => onSetInput(p.text),
      group: 'Prompts',
      keywords: p.label.toLowerCase(),
    }));
    const chatItems: CommandItem[] = chats.slice(0, 30).map((c) => ({
      id: `chat-${c.id}`,
      label: c.title,
      icon: MessageSquareIcon,
      action: () => onSelectChat(c.id),
      group: 'Chats',
      keywords: c.title.toLowerCase(),
    }));
    return [...actions, ...prompts, ...chatItems];
  }, [chats, onNewChat, onToggleSidebar, onOpenSettings, onOpenShare, onSelectChat, onSetInput]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) =>
      it.label.toLowerCase().includes(q) ||
      it.group.toLowerCase().includes(q) ||
      (it.keywords || '').includes(q)
    );
  }, [items, query]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[activeIdx]?.action(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  // Group filtered items.
  const groups = useMemo(() => {
    const g: Record<string, CommandItem[]> = {};
    for (const it of filtered) {
      if (!g[it.group]) g[it.group] = [];
      g[it.group].push(it);
    }
    return g;
  }, [filtered]);

  let flatIdx = -1;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search commands, chats, or prompts..."
            className="flex-1 bg-transparent py-3 text-[14px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border px-1.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-muted-foreground">No matches for "{query}"</div>
          ) : (
            Object.entries(groups).map(([group, groupItems]) => (
              <div key={group} className="mb-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</div>
                {groupItems.map((it) => {
                  flatIdx++;
                  const isActive = flatIdx === activeIdx;
                  const idx = flatIdx;
                  return (
                    <button
                      key={it.id}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => it.action()}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'
                      )}
                    >
                      <it.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.hint && <kbd className="text-[10px] text-muted-foreground">{it.hint}</kbd>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>↑↓ to navigate · ↵ to select</span>
          <span>{filtered.length} results</span>
        </div>
      </div>
    </div>
  );
}
