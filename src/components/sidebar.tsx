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
        'sidebar-item group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] border-l-2',
        currentId === c.id
          ? 'active border-l-[hsl(var(--primary))] bg-[hsl(var(--sidebar-accent)/0.6)] text-[hsl(var(--sidebar-accent-foreground))] shadow-[0_0_12px_hsl(var(--primary)/0.08)]'
          : 'border-l-transparent bg-[hsl(var(--card)/0.25)] text-[hsl(var(--sidebar-foreground)/0.55)] hover:bg-[hsl(var(--sidebar-accent)/0.4)] hover:text-[hsl(var(--sidebar-foreground))] hover:shadow-[0_0_8px_hsl(var(--primary)/0.04)]',
        !isOpen && 'md:justify-center md:px-0'
      )}
    >
      <button onClick={() => editingId === c.id ? undefined : onSelect(c.id)} className="flex flex-1 items-center gap-2.5 min-w-0">
        <MessageSquareIcon className={cn(
          'h-[14px] w-[14px] shrink-0 transition-colors',
          currentId === c.id ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--sidebar-foreground)/0.4)] group-hover:text-[hsl(var(--sidebar-foreground)/0.7)]'
        )} />
        {editingId === c.id ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 rounded-lg border border-[hsl(var(--primary)/0.25)] bg-[hsl(var(--background)/0.8)] px-2 py-0.5 text-[12px] text-[hsl(var(--sidebar-accent-foreground))] outline-none focus:border-[hsl(var(--primary)/0.5)] focus:shadow-[0_0_0_2px_hsl(var(--primary)/0.1)] transition-all"
          />
        ) : (
          <span className={cn(
            'flex-1 truncate transition-all font-medium',
            isOpen ? 'opacity-100' : 'opacity-0 md:hidden',
            currentId === c.id && 'text-glow-teal'
          )}>{c.title}</span>
        )}
      </button>

      {c.pinned && <PinIcon className="h-3 w-3 shrink-0 text-[hsl(var(--primary)/0.6)]" />}

      {isOpen && (hovered === c.id || menuOpen === c.id) && editingId !== c.id && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}
            className="shrink-0 rounded-lg p-1 text-[hsl(var(--sidebar-foreground)/0.3)] transition-all hover:bg-[hsl(var(--card)/0.4)] hover:text-[hsl(var(--sidebar-foreground))]"
            title="More"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
          {menuOpen === c.id && (
            <div
              className="glass-strong absolute right-0 top-10 z-50 w-48 rounded-xl py-1 shadow-[0_8px_32px_hsl(0_0%_0%/0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => onTogglePin(c.id)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[12px] text-[hsl(var(--sidebar-foreground)/0.7)] transition-colors hover:bg-[hsl(var(--primary)/0.08)] hover:text-[hsl(var(--sidebar-accent-foreground))]">
                <PinIcon className="h-3.5 w-3.5" /> {c.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button onClick={() => startEdit(c)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[12px] text-[hsl(var(--sidebar-foreground)/0.7)] transition-colors hover:bg-[hsl(var(--primary)/0.08)] hover:text-[hsl(var(--sidebar-accent-foreground))]">
                <PencilIcon className="h-3.5 w-3.5" /> Rename
              </button>
              <button onClick={() => { onFork(c.id); setMenuOpen(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[12px] text-[hsl(var(--sidebar-foreground)/0.7)] transition-colors hover:bg-[hsl(var(--primary)/0.08)] hover:text-[hsl(var(--sidebar-accent-foreground))]">
                <GitForkIcon className="h-3.5 w-3.5" /> Fork
              </button>
              <button onClick={() => handleExport(c)} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[12px] text-[hsl(var(--sidebar-foreground)/0.7)] transition-colors hover:bg-[hsl(var(--primary)/0.08)] hover:text-[hsl(var(--sidebar-accent-foreground))]">
                <DownloadIcon className="h-3.5 w-3.5" /> Export
              </button>
              <div className="mx-2 my-1 h-px bg-[hsl(var(--border)/0.5)]" />
              <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); setMenuOpen(null); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[12px] text-[hsl(var(--destructive)/0.8)] transition-colors hover:bg-[hsl(var(--destructive)/0.1)] hover:text-[hsl(var(--destructive))]">
                <TrashIcon className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden transition-opacity duration-300"
          style={{ background: 'hsl(215 30% 3% / 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={onToggle}
        />
      )}

      {/* Sidebar panel */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-sidebar transition-all duration-300 ease-out md:static md:shrink-0',
        isOpen
          ? 'w-72 translate-x-0 border-r border-[hsl(var(--sidebar-border)/0.5)]'
          : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden border-r border-[hsl(var(--sidebar-border)/0.5)] md:border-none'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <img src="/xylaria-logo.png" alt="" className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-[0_0_16px_hsl(var(--primary)/0.12)]" />
              <div className="absolute -inset-1 rounded-xl bg-[hsl(var(--primary)/0.06)] blur-md -z-10" />
            </div>
            <span className={cn(
              'whitespace-nowrap text-[15px] font-semibold tracking-tight transition-opacity',
              isOpen ? 'opacity-100' : 'opacity-0 md:hidden',
              'text-[hsl(var(--foreground)/0.95)]'
            )}>
              Xylaria
            </span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {isOpen && (
              <button
                onClick={onToggle}
                className="rounded-lg p-1.5 text-[hsl(var(--sidebar-foreground)/0.4)] transition-all hover:bg-[hsl(var(--card)/0.3)] hover:text-[hsl(var(--sidebar-foreground))] md:hidden"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-2 pb-2">
          <button
            onClick={onNew}
            className={cn(
              'btn-primary-gradient flex w-full items-center justify-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium shadow-[0_2px_12px_hsl(var(--primary)/0.15)]',
              !isOpen && 'md:px-0'
            )}
          >
            <PenSquareIcon className="h-4 w-4 shrink-0" />
            <span className={cn('whitespace-nowrap transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>
              New chat
            </span>
          </button>
        </div>

        {/* View tabs: Chats / Prompts */}
        {isOpen && (
          <div className="px-3 pb-2">
            <div className="glass flex rounded-xl p-[3px]">
              <button
                onClick={() => setView('chats')}
                className={cn(
                  'flex-1 rounded-lg px-3 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-200',
                  view === 'chats'
                    ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary)/0.1)]'
                    : 'text-[hsl(var(--sidebar-foreground)/0.4)] hover:text-[hsl(var(--sidebar-foreground)/0.7)]'
                )}
              >
                Chats
              </button>
              <button
                onClick={() => setView('prompts')}
                className={cn(
                  'flex-1 rounded-lg px-3 py-1.5 text-[11px] font-medium tracking-wide transition-all duration-200',
                  view === 'prompts'
                    ? 'bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] shadow-[0_0_8px_hsl(var(--primary)/0.1)]'
                    : 'text-[hsl(var(--sidebar-foreground)/0.4)] hover:text-[hsl(var(--sidebar-foreground)/0.7)]'
                )}
              >
                Prompts
              </button>
            </div>
          </div>
        )}

        {/* Teal accent divider */}
        <div className="accent-line mx-3" />

        {isOpen && view === 'chats' && (
          <>
            {/* Search */}
            <div className="px-3 pt-2 pb-1">
              <div className="glass input-glow relative flex items-center rounded-xl">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--sidebar-foreground)/0.3)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full bg-transparent px-9 py-2 text-[12px] text-[hsl(var(--sidebar-accent-foreground))] placeholder:text-[hsl(var(--sidebar-foreground)/0.3)] outline-none"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--sidebar-foreground)/0.3)] transition-colors hover:text-[hsl(var(--sidebar-foreground))]">
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Chat list */}
            <ScrollArea className="flex-1 px-3">
              <div className="space-y-[3px] py-2">
                {sorted.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <MessageSquareIcon className="h-6 w-6 text-[hsl(var(--sidebar-foreground)/0.12)]" />
                    <span className="text-[11px] text-[hsl(var(--sidebar-foreground)/0.25)]">
                      {search ? 'No matches found' : 'No chats yet'}
                    </span>
                  </div>
                ) : (
                  <>
                    {pinned.length > 0 && (
                      <div className="mb-2">
                        <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--sidebar-foreground)/0.3)]">
                          Pinned
                        </div>
                        <div className="space-y-[3px]">
                          {pinned.map(renderItem)}
                        </div>
                      </div>
                    )}
                    {Object.entries(groups).map(([label, items]) => (
                      items.length > 0 && (
                        <div key={label} className="mb-2">
                          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--sidebar-foreground)/0.3)]">
                            {label}
                          </div>
                          <div className="space-y-[3px]">
                            {items.map(renderItem)}
                          </div>
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
            <div className="space-y-1.5 py-2">
              <p className="px-2 py-1.5 text-[10px] text-[hsl(var(--sidebar-foreground)/0.3)] tracking-wide">
                Click a prompt to load it into the input.
              </p>
              {PROMPT_TEMPLATES.map((p) => (
                <button
                  key={p.title}
                  onClick={() => { onUsePrompt(p.text); setView('chats'); }}
                  className="suggestion-card group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left"
                >
                  <div className="mt-0.5 rounded-lg bg-[hsl(var(--primary)/0.1)] p-1.5 transition-all group-hover:bg-[hsl(var(--primary)/0.18)] group-hover:shadow-[0_0_8px_hsl(var(--primary)/0.1)]">
                    <p.icon className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-[hsl(var(--sidebar-accent-foreground))]">{p.title}</div>
                    <div className="mt-0.5 text-[10px] leading-relaxed text-[hsl(var(--sidebar-foreground)/0.4)] line-clamp-2">{p.text}</div>
                    <div className="mt-1.5 text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--primary)/0.45)] font-medium">{p.category}</div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="mt-auto">
          <div className="accent-line mx-3" />
          <div className="px-3 py-2.5 space-y-0.5">
            <button
              onClick={onSettings}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium text-[hsl(var(--sidebar-foreground)/0.35)] transition-all duration-200 hover:bg-[hsl(var(--card)/0.3)] hover:text-[hsl(var(--sidebar-foreground)/0.7)]',
                !isOpen && 'md:justify-center md:px-0'
              )}
            >
              <SettingsIcon className="h-[15px] w-[15px] shrink-0" />
              <span className={cn('whitespace-nowrap transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>
                Settings
              </span>
            </button>
            {sorted.length > 0 && (
              <button
                onClick={() => setShowClear(true)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12px] font-medium text-[hsl(var(--sidebar-foreground)/0.25)] transition-all duration-200 hover:bg-[hsl(var(--destructive)/0.08)] hover:text-[hsl(var(--destructive)/0.7)]',
                  !isOpen && 'md:justify-center md:px-0'
                )}
              >
                <TrashIcon className="h-[15px] w-[15px] shrink-0" />
                <span className={cn('whitespace-nowrap transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 md:hidden')}>
                  Delete all
                </span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Clear Confirm Modal */}
      {showClear && (
        <div
          className="modal-overlay fixed inset-0 z-[60] flex items-center justify-center"
          onClick={() => setShowClear(false)}
        >
          <div
            className="glass-strong rounded-2xl p-6 shadow-[0_16px_48px_hsl(0_0%_0%/0.5)] max-w-sm w-[calc(100%-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
              Delete all chats?
            </h4>
            <p className="text-[12px] text-[hsl(var(--muted-foreground))] mb-5 leading-relaxed">
              This cannot be undone. All chat history will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowClear(false)}
                className="btn-glass rounded-lg px-4 py-1.5 text-[12px] font-medium text-[hsl(var(--secondary-foreground))]"
              >
                Cancel
              </button>
              <button
                onClick={() => { onClear(); setShowClear(false); }}
                className="rounded-lg bg-[hsl(var(--destructive))] px-4 py-1.5 text-[12px] font-medium text-[hsl(var(--destructive-foreground))] shadow-[0_2px_8px_hsl(var(--destructive)/0.3)] transition-all hover:shadow-[0_2px_16px_hsl(var(--destructive)/0.4)]"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}