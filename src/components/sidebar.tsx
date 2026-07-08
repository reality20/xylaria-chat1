'use client';

import { useState, useMemo } from 'react';
import {
  MessageSquareIcon, PenSquareIcon, TrashIcon, XIcon, SettingsIcon,
  SearchIcon, PinIcon, GitForkIcon, PencilIcon, DownloadIcon,
  SparklesIcon, ZapIcon, BrainIcon, CodeIcon, BookOpenIcon, ImageIcon,
} from 'lucide-react';
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
  onTogglePin: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onFork: (id: string) => void;
  onExport: (id: string) => string;
  onUsePrompt: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface PromptTemplate {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  category: string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  { icon: SparklesIcon, title: 'Image: Cinematic portrait', text: 'Generate an image: a cinematic portrait of a young woman with freckles, soft morning light, shallow depth of field, 85mm lens, photorealistic, ultra-detailed.', category: 'Image' },
  { icon: ImageIcon, title: 'Image: Logo design', text: 'Generate an image: a minimalist logo for a tech startup called "Nimbus", flat design, geometric, single color, white background, vector style.', category: 'Image' },
  { icon: CodeIcon, title: 'Code: React component', text: 'Create a React component for a draggable todo list with local storage persistence. Include TypeScript types and Tailwind styling. Show as an artifact.', category: 'Code' },
  { icon: CodeIcon, title: 'Code: SVG illustration', text: 'Generate an SVG illustration of a mountain landscape at sunset, with layered hills, a sun, and simple gradient sky. Use the svg_generator tool.', category: 'Code' },
  { icon: BookOpenIcon, title: 'Research: Explain a topic', text: 'Research and explain how transformer neural networks work, including attention mechanisms, positional encoding, and key architectural innovations. Cite sources.', category: 'Research' },
  { icon: BrainIcon, title: 'Brainstorm: Startup ideas', text: 'Brainstorm 10 startup ideas at the intersection of AI and personal productivity. For each, give a one-sentence pitch and the key insight.', category: 'Writing' },
  { icon: ZapIcon, title: 'Quick: Summarize', text: 'Summarize the key points of the following text in 5 bullet points:\n\n', category: 'Quick' },
  { icon: SparklesIcon, title: 'Writing: Blog post', text: 'Write a 600-word blog post about the future of remote work in 2030, including specific predictions and actionable advice. Use markdown formatting.', category: 'Writing' },
];

export function Sidebar({
  chats, currentId, onSelect, onNew, onDelete, onClear, onSettings,
  onTogglePin, onRename, onFork, onExport, onUsePrompt,
  isOpen, onToggle,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showClear, setShowClear] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [view, setView] = useState<'chats' | 'prompts'>('chats');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Sorted: pinned first, then by updatedAt desc.
  const sorted = useMemo(() => {
    const filtered = search
      ? chats.filter((c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          c.messages.some((m) => m.content.toLowerCase().includes(search.toLowerCase()))
        )
      : chats;
    return [...filtered].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [chats, search]);

  const pinned = sorted.filter((c) => c.pinned);
  const recent = sorted.filter((c) => !c.pinned);

  // Group recent by date.
  const groups = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86_400_000;
    const weekAgo = today - 7 * 86_400_000;
    const monthAgo = today - 30 * 86_400_000;
    const g: Record<string, Chat[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], 'Previous 30 days': [], Older: [] };
    for (const c of recent) {
      if (c.updatedAt >= today) g.Today.push(c);
      else if (c.updatedAt >= yesterday) g.Yesterday.push(c);
      else if (c.updatedAt >= weekAgo) g['Previous 7 days'].push(c);
      else if (c.updatedAt >= monthAgo) g['Previous 30 days'].push(c);
      else g.Older.push(c);
    }
    return g;
  }, [recent]);

  const startEdit = (c: Chat) => { setEditingId(c.id); setEditTitle(c.title); setMenuOpen(null); };
  const commitEdit = () => { if (editingId && editTitle.trim()) onRename(editingId, editTitle.trim()); setEditingId(null); };
  const handleExport = (c: Chat) => {
    const md = onExport(c.id);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${c.title.replace(/\s+/g, '-').toLowerCase()}.md`; a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(null);
  };

  const renderItem = (c: Chat) => (
    <div
      key={c.id}
      onMouseEnter={() => setHovered(c.id)}
      onMouseLeave={() => { setHovered(null); setMenuOpen(null); }}
      className={cn(
        'group relative flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-all',
        currentId === c.id ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
        !isOpen && 'md:justify-center md:px-0'
      )}
    >
      <button onClick={() => editingId === c.id ? undefined : onSelect(c.id)} className="flex flex-1 items-center gap-2 min-w-0">
        <MessageSquareIcon className="h-3.5 w-3.5 shrink-0" />
        {editingId === c.id ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded border border-primary/30 bg-background px-1.5 py-0.5 text-[12px] outline-none"
          />
        ) : (
          <span className={cn('flex-1 truncate transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>{c.title}</span>
        )}
      </button>

      {c.pinned && <PinIcon className="h-3 w-3 shrink-0 text-primary/70" />}

      {isOpen && (hovered === c.id || menuOpen === c.id) && editingId !== c.id && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}
            className="shrink-0 rounded p-0.5 text-sidebar-foreground/40 opacity-100 hover:text-sidebar-foreground"
            title="More"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
          {menuOpen === c.id && (
            <div
              className="absolute right-0 top-9 z-50 w-44 rounded-lg border border-border bg-popover py-1 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => onTogglePin(c.id)} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent">
                <PinIcon className="h-3 w-3" /> {c.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button onClick={() => startEdit(c)} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent">
                <PencilIcon className="h-3 w-3" /> Rename
              </button>
              <button onClick={() => { onFork(c.id); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent">
                <GitForkIcon className="h-3 w-3" /> Fork
              </button>
              <button onClick={() => handleExport(c)} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] hover:bg-accent">
                <DownloadIcon className="h-3 w-3" /> Export
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-[12px] text-destructive hover:bg-destructive/10">
                <TrashIcon className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden" onClick={onToggle} />}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:static md:shrink-0',
        isOpen ? 'w-72 translate-x-0 border-r border-border' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden border-r border-border md:border-none'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/xylaria-logo.png" alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain shadow-sm" />
            <span className={cn('whitespace-nowrap text-[15px] font-semibold transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>Xylaria</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isOpen && (
              <button onClick={onToggle} className="rounded-lg p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors md:hidden">
                <XIcon className="h-4 w-4" />
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

        {/* View tabs: Chats / Prompts */}
        {isOpen && (
          <div className="px-3 pb-2">
            <div className="flex rounded-lg border border-sidebar-border/40 bg-sidebar-accent/20 p-0.5">
              <button onClick={() => setView('chats')} className={cn('flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors', view === 'chats' ? 'bg-sidebar-background shadow-sm text-sidebar-foreground' : 'text-sidebar-foreground/50')}>
                Chats
              </button>
              <button onClick={() => setView('prompts')} className={cn('flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors', view === 'prompts' ? 'bg-sidebar-background shadow-sm text-sidebar-foreground' : 'text-sidebar-foreground/50')}>
                Prompts
              </button>
            </div>
          </div>
        )}

        {isOpen && view === 'chats' && (
          <>
            {/* Search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full rounded-lg border border-sidebar-border/40 bg-sidebar-accent/20 px-8 py-1.5 text-[12px] text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none focus:border-primary/30"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-sidebar-foreground/40 hover:text-sidebar-foreground">
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Chat list */}
            <ScrollArea className="flex-1 px-3">
              <div className="space-y-0.5 py-1">
                {sorted.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-sidebar-foreground/30">
                    {search ? 'No matches found' : 'No chats yet'}
                  </div>
                ) : (
                  <>
                    {pinned.length > 0 && (
                      <div className="mb-1">
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">Pinned</div>
                        {pinned.map(renderItem)}
                      </div>
                    )}
                    {Object.entries(groups).map(([label, items]) => (
                      items.length > 0 && (
                        <div key={label} className="mb-1">
                          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">{label}</div>
                          {items.map(renderItem)}
                        </div>
                      )
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}

        {isOpen && view === 'prompts' && (
          <ScrollArea className="flex-1 px-3">
            <div className="space-y-1 py-1">
              <p className="px-1 py-1 text-[10px] text-sidebar-foreground/40">Click a prompt to load it into the input.</p>
              {PROMPT_TEMPLATES.map((p) => (
                <button
                  key={p.title}
                  onClick={() => { onUsePrompt(p.text); setView('chats'); }}
                  className="group flex w-full items-start gap-2 rounded-xl border border-sidebar-border/40 bg-sidebar-accent/10 px-2.5 py-2 text-left transition-all hover:border-primary/30 hover:bg-sidebar-accent/30"
                >
                  <div className="mt-0.5 rounded-md bg-primary/10 p-1">
                    <p.icon className="h-3 w-3 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-sidebar-foreground">{p.title}</div>
                    <div className="text-[10px] text-sidebar-foreground/50 line-clamp-2">{p.text}</div>
                    <div className="mt-0.5 text-[9px] uppercase tracking-wide text-sidebar-foreground/30">{p.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

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
