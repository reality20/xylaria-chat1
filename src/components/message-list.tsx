'use client';

import { useRef, useEffect, useState } from 'react';
import {
  UserIcon, BotIcon, RotateCcwIcon, CopyIcon, CheckIcon, CodeIcon,
  WrenchIcon, LightbulbIcon, SparklesIcon, GitForkIcon,
  PencilIcon, ImageIcon, SearchIcon, BookOpenIcon, DownloadIcon,
  ArrowDownIcon,
} from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import type { Message } from '@/types';
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer';

interface Props {
  messages: Message[];
  status: string;
  onRegenerate: (id: string) => void;
  onOpenArtifact: (code: string, lang?: string) => void;
  onEditUserMessage?: (id: string, newContent: string) => void;
  onFork?: (fromMessageId: string) => void;
}

const SUGGESTIONS = [
  { icon: LightbulbIcon, title: 'Explain a concept', text: 'Explain quantum computing in simple terms with an analogy' },
  { icon: SearchIcon, title: 'Search the web', text: 'What are the latest developments in AI this week?' },
  { icon: ImageIcon, title: 'Generate an image', text: 'Generate an image of a serene Japanese garden with cherry blossoms at sunrise' },
  { icon: CodeIcon, title: 'Write code', text: 'Create a React component for a draggable todo list with TypeScript' },
  { icon: BookOpenIcon, title: 'Research a topic', text: 'Research the history and impact of the printing press' },
  { icon: SparklesIcon, title: 'Get creative', text: 'Write a short sci-fi story about an AI that discovers emotions' },
];

export function MessageList({ messages, status, onRegenerate, onOpenArtifact, onEditUserMessage, onFork }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  // Track whether the user has scrolled away from the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
      setAutoScroll(atBottom);
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (autoScroll) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, status, autoScroll]);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (m: Message) => { setEditingId(m.id); setEditText(m.content); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };
  const commitEdit = (id: string) => {
    if (editText.trim() && onEditUserMessage) onEditUserMessage(id, editText.trim());
    cancelEdit();
  };

  const displayMessages = messages.filter((m) => m.role !== 'tool');

  /* ── Empty State ──────────────────────────────────────────── */
  if (displayMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <div className="flex flex-col items-center gap-8 px-4 py-8 animate-in fade-in duration-500 max-w-2xl w-full">
          {/* Logo with teal glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur-2xl" />
            <div className="relative glow-teal rounded-2xl">
              <img
                src="/xylaria-logo.png"
                alt="Xylaria"
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-contain"
              />
            </div>
          </div>

          {/* Welcome heading */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-glow-teal">
              Welcome to Xylaria
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
              An agentic AI with tools, code execution, image generation, and web search.
            </p>
          </div>

          {/* Suggestion cards — 2 cols on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('xylaria-use-suggestion', { detail: s.text }));
                }}
                className="suggestion-card group flex items-start gap-3 rounded-xl p-4 text-left text-[13px] text-card-foreground"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground text-sm">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{s.text}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Message List ─────────────────────────────────────────── */
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
      <div className="mx-auto max-w-3xl space-y-6 px-3 sm:px-4 py-6">
        {displayMessages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLast = idx === displayMessages.length - 1;
          const isStreaming = isLast && status === 'streaming' && !msg.content;
          const hasCode = /```(\w+)?\n/.test(msg.content);
          const hasImage = /!\[[^\]]*\]\([^)]+\)/.test(msg.content);

          return (
            <div
              key={msg.id}
              className={cn(
                'group flex gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
                isUser ? 'flex-row-reverse' : 'flex-row',
              )}
            >
              {/* ── Avatar ─────────────────────────────────────── */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm',
                  isUser
                    ? 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground'
                    : 'bg-gradient-to-br from-secondary to-card text-secondary-foreground border border-border/50',
                )}
              >
                {isUser
                  ? <UserIcon className="h-4 w-4" />
                  : <BotIcon className="h-4 w-4" />
                }
              </div>

              {/* ── Content column ─────────────────────────────── */}
              <div
                className={cn(
                  'flex min-w-0 flex-col',
                  isUser
                    ? 'items-end max-w-[85%] sm:max-w-[80%]'
                    : 'items-start flex-1 max-w-[90%] sm:max-w-[85%]',
                )}
              >
                {/* Name + timestamp */}
                <div className="flex items-center gap-2 mb-1.5 px-1">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {isUser ? 'You' : 'Xylaria'}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    'rounded-2xl px-4 py-3 shadow-sm',
                    isUser ? 'bubble-user' : 'bubble-assistant',
                  )}
                >
                  {/* Editing state for user messages */}
                  {isUser && editingId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[260px]">
                      <textarea
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-[13px] text-white placeholder:text-white/60 outline-none resize-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg px-3 py-1.5 text-[11px] font-medium bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => commitEdit(msg.id)}
                          className="rounded-lg px-3 py-1.5 text-[11px] font-medium bg-white text-primary hover:bg-white/90 transition-colors"
                        >
                          Save &amp; Send
                        </button>
                      </div>
                    </div>
                  ) : isUser ? (
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                      {msg.content}
                    </p>
                  ) : (
                    <div className="text-foreground">
                      {msg.content ? <MarkdownRenderer content={msg.content} /> : null}
                      {isStreaming && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Tool call badges ─────────────────────────── */}
                {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                    {msg.tool_calls.map((tc) => (
                      <span
                        key={tc.id}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary"
                      >
                        <WrenchIcon className="h-2.5 w-2.5" />
                        {tc.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── Action pills ─────────────────────────────── */}
                {editingId !== msg.id && msg.content && (
                  <div className="mt-2 flex items-center gap-1 px-1 opacity-0 translate-y-0.5 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 focus-within:opacity-100 focus-within:translate-y-0">
                    <ActionBtn
                      icon={copiedId === msg.id ? CheckIcon : CopyIcon}
                      label={copiedId === msg.id ? 'Copied' : 'Copy'}
                      onClick={() => handleCopy(msg.content, msg.id)}
                    />
                    {isUser && onEditUserMessage && (
                      <ActionBtn icon={PencilIcon} label="Edit" onClick={() => startEdit(msg)} />
                    )}
                    {!isUser && (
                      <ActionBtn icon={RotateCcwIcon} label="Retry" onClick={() => onRegenerate(msg.id)} />
                    )}
                    {onFork && (
                      <ActionBtn icon={GitForkIcon} label="Fork" onClick={() => onFork(msg.id)} />
                    )}
                    {hasCode && (
                      <ActionBtn
                        icon={CodeIcon}
                        label="Code"
                        onClick={() => {
                          const m = msg.content.match(/```(\w+)?\n([\s\S]*?)```/);
                          if (m) onOpenArtifact(m[2], m[1]);
                        }}
                      />
                    )}
                    {hasImage && (
                      <ActionBtn
                        icon={DownloadIcon}
                        label="Save"
                        onClick={() => {
                          const urls = Array.from(
                            msg.content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g),
                          ).map((m) => m[1]);
                          urls.forEach((u) => {
                            const a = document.createElement('a');
                            a.href = u;
                            a.download = '';
                            a.target = '_blank';
                            a.click();
                          });
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Scroll-to-bottom button (glass + teal border hint) ── */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            scrollRef.current?.scrollTo({
              top: scrollRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }}
          className={cn(
            'fixed bottom-24 left-1/2 -translate-x-1/2 z-30',
            'flex items-center gap-1.5',
            'rounded-full px-4 py-2',
            'glass',
            'shadow-lg',
            'text-[12px] font-medium text-foreground',
            'hover:border-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.12)]',
            'transition-all duration-200',
          )}
        >
          <ArrowDownIcon className="h-3.5 w-3.5 text-primary" />
          Scroll to bottom
        </button>
      )}
    </div>
  );
}

/* ── Action pill button ──────────────────────────────────────── */
function ActionBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'action-pill',
        'flex items-center gap-1.5',
        'rounded-full px-2.5 py-1',
        'text-[11px] text-muted-foreground',
      )}
      title={label}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}