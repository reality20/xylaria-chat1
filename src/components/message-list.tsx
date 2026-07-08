'use client';

import { useRef, useEffect, useState } from 'react';
import {
  UserIcon, BotIcon, RotateCcwIcon, CopyIcon, CheckIcon, CodeIcon,
  WrenchIcon, LightbulbIcon, SparklesIcon, GitForkIcon,
  PencilIcon, ImageIcon, SearchIcon, BookOpenIcon, DownloadIcon,
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

  if (displayMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <div className="flex flex-col items-center gap-6 px-4 py-8 animate-in fade-in duration-500 max-w-2xl w-full">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/5 rounded-2xl blur-xl" />
            <img src="/xylaria-logo.png" alt="Xylaria" className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-contain shadow-lg" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Welcome to Xylaria</h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">An agentic AI with tools, code execution, image generation, and web search.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.text}
                onClick={() => {
                  // Use the global input setter via custom event.
                  window.dispatchEvent(new CustomEvent('xylaria-use-suggestion', { detail: s.text }));
                }}
                className="group flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 sm:p-4 text-left text-[13px] text-card-foreground transition-all hover:border-primary/30 hover:shadow-md hover:bg-accent/50"
              >
                <div className="mt-0.5 rounded-md bg-primary/10 p-1.5 group-hover:bg-primary/20 transition-colors">
                  <s.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{s.text}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
      <div className="mx-auto max-w-3xl space-y-5 px-3 sm:px-4 py-6">
        {displayMessages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLast = idx === displayMessages.length - 1;
          const isStreaming = isLast && status === 'streaming' && !msg.content;
          const hasCode = /```(\w+)?\n/.test(msg.content);
          const hasImage = /!\[[^\]]*\]\([^)]+\)/.test(msg.content);

          return (
            <div key={msg.id} className={cn('group flex gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300', isUser ? 'flex-row-reverse' : 'flex-row')}>
              {/* Avatar */}
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm',
                isUser ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-primary/80 to-primary/60 text-primary-foreground'
              )}>
                {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <BotIcon className="h-3.5 w-3.5" />}
              </div>

              {/* Content */}
              <div className={cn('flex min-w-0 flex-col', isUser ? 'items-end max-w-[85%] sm:max-w-[80%]' : 'items-start flex-1 max-w-[90%] sm:max-w-[85%]')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-medium text-muted-foreground">{isUser ? 'You' : 'Xylaria'}</span>
                  <span className="text-[10px] text-muted-foreground/50">{formatTime(msg.createdAt)}</span>
                </div>

                <div className={cn(
                  'rounded-2xl px-3 sm:px-4 py-2.5 shadow-sm',
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/70 border border-border/40'
                )}>
                  {isUser && editingId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[260px]">
                      <textarea
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full rounded-md bg-primary-foreground/10 border border-primary-foreground/20 px-2 py-1.5 text-[13px] text-primary-foreground placeholder:text-primary-foreground/60 outline-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button onClick={cancelEdit} className="rounded-md px-2 py-1 text-[11px] bg-primary-foreground/10 hover:bg-primary-foreground/20">
                          Cancel
                        </button>
                        <button onClick={() => commitEdit(msg.id)} className="rounded-md px-2 py-1 text-[11px] bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                          Save & Send
                        </button>
                      </div>
                    </div>
                  ) : isUser ? (
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{msg.content}</p>
                  ) : (
                    <div className="text-foreground">
                      {msg.content ? <MarkdownRenderer content={msg.content} /> : null}
                      {isStreaming && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Tool call badges */}
                {!isUser && msg.tool_calls && msg.tool_calls.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {msg.tool_calls.map((tc) => (
                      <span key={tc.id} className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600">
                        <WrenchIcon className="h-2.5 w-2.5" />{tc.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {editingId !== msg.id && msg.content && (
                  <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <ActionBtn icon={copiedId === msg.id ? CheckIcon : CopyIcon} label={copiedId === msg.id ? 'Copied' : 'Copy'} onClick={() => handleCopy(msg.content, msg.id)} />
                    {isUser && onEditUserMessage && (
                      <ActionBtn icon={PencilIcon} label="Edit" onClick={() => startEdit(msg)} />
                    )}
                    {!isUser && (
                      <ActionBtn icon={RotateCcwIcon} label="Retry" onClick={() => onRegenerate(msg.id)} />
                    )}
                    {onFork && (
                      <ActionBtn icon={GitForkIcon} label="Fork here" onClick={() => onFork(msg.id)} />
                    )}
                    {hasCode && <ActionBtn icon={CodeIcon} label="Code" onClick={() => { const m = msg.content.match(/```(\w+)?\n([\s\S]*?)```/); if (m) onOpenArtifact(m[2], m[1]); }} />}
                    {hasImage && <ActionBtn icon={DownloadIcon} label="Save images" onClick={() => {
                      // Find all image URLs in the message and offer them for download.
                      const urls = Array.from(msg.content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)).map((m) => m[1]);
                      urls.forEach((u) => { const a = document.createElement('a'); a.href = u; a.download = ''; a.target = '_blank'; a.click(); });
                    }} />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scroll-to-bottom button */}
      {!autoScroll && (
        <button
          onClick={() => { setAutoScroll(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 rounded-full border border-border bg-background/95 px-3 py-1.5 text-[11px] shadow-lg backdrop-blur hover:bg-accent transition-colors"
        >
          ↓ Scroll to bottom
        </button>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-all hover:bg-accent hover:text-foreground" title={label}>
      <Icon className="h-3 w-3" /><span className="hidden sm:inline">{label}</span>
    </button>
  );
}
