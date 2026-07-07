'use client';

import { useRef, useEffect, useState } from 'react';
import { UserIcon, BotIcon, RotateCcwIcon, CopyIcon, CheckIcon, CodeIcon, WrenchIcon, ZapIcon, LightbulbIcon, SparklesIcon } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';
import type { Message } from '@/types';
import { MarkdownRenderer } from '@/components/markdown/markdown-renderer';

interface Props {
  messages: Message[];
  status: string;
  onRegenerate: (id: string) => void;
  onOpenArtifact: (code: string, lang?: string) => void;
}

export function MessageList({ messages, status, onRegenerate, onOpenArtifact }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, status]);

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const displayMessages = messages.filter((m) => m.role !== 'tool');

  if (displayMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-5 px-4 animate-in fade-in duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur-xl" />
            <img src="/xylaria-logo.png" alt="Xylaria" className="relative h-16 w-16 rounded-2xl object-contain shadow-lg" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold tracking-tight">Welcome to Xylaria</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">Agentic AI with tools, code execution, and more.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
            {[
              { icon: LightbulbIcon, text: 'Explain quantum computing simply' },
              { icon: ZapIcon, text: 'What\'s the weather in Tokyo?' },
              { icon: SparklesIcon, text: 'Calculate 125 * 37 + 98' },
              { icon: CodeIcon, text: 'Search latest AI news' },
            ].map((s) => (
              <button key={s.text} className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-left text-[13px] text-card-foreground transition-all hover:border-primary/30 hover:shadow-sm hover:bg-accent/50">
                <s.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="group-hover:text-foreground transition-colors">{s.text}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {['Run JS: fibonacci(20)', 'Convert 100 miles to km', 'Analyze text readability', 'Fetch https://example.com'].map((s) => (
              <span key={s} className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-[11px] text-muted-foreground">{s}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {displayMessages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isLast = idx === displayMessages.length - 1;
          const isStreaming = isLast && status === 'streaming' && !msg.content;
          const hasCode = /```(\w+)?\n/.test(msg.content);

          return (
            <div key={msg.id} className={cn('group flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300', isUser ? 'flex-row-reverse' : 'flex-row')}>
              {/* Avatar */}
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-sm',
                isUser ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border/50'
              )}>
                {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <BotIcon className="h-3.5 w-3.5" />}
              </div>

              {/* Content */}
              <div className={cn('flex min-w-0 flex-col', isUser ? 'items-end max-w-[80%]' : 'items-start flex-1 max-w-[85%]')}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-medium text-muted-foreground">{isUser ? 'You' : 'Xylaria'}</span>
                  <span className="text-[10px] text-muted-foreground/50">{formatTime(msg.createdAt)}</span>
                </div>

                <div className={cn(
                  'rounded-2xl px-4 py-2.5 shadow-sm',
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/70 border border-border/40'
                )}>
                  {isUser ? (
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
                {!isUser && msg.content && (
                  <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <ActionBtn icon={copiedId === msg.id ? CheckIcon : CopyIcon} label={copiedId === msg.id ? 'Copied' : 'Copy'} onClick={() => handleCopy(msg.content, msg.id)} />
                    <ActionBtn icon={RotateCcwIcon} label="Retry" onClick={() => onRegenerate(msg.id)} />
                    {hasCode && <ActionBtn icon={CodeIcon} label="Code" onClick={() => { const m = msg.content.match(/```(\w+)?\n([\s\S]*?)```/); if (m) onOpenArtifact(m[2], m[1]); }} />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-all hover:bg-accent hover:text-foreground" title={label}>
      <Icon className="h-3 w-3" /><span>{label}</span>
    </button>
  );
}
