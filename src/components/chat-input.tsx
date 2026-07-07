'use client';

import { useRef, useEffect } from 'react';
import { SendIcon, SquareIcon, CpuIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  status: string;
}

export function ChatInput({ input, onInputChange, onSend, onStop, status }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === 'submitted' || status === 'streaming' || status === 'tool-calling';

  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = `${Math.min(ref.current.scrollHeight, 160)}px`; }
  }, [input]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isLoading && input.trim()) onSend(); }
    if (e.key === 'Tab') { e.preventDefault(); const el = e.currentTarget; const s = el.selectionStart; onInputChange(input.slice(0, s) + '  ' + input.slice(el.selectionEnd)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + 2; }, 0); }
  };

  return (
    <div className="shrink-0 border-t border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="relative flex flex-col rounded-2xl border border-border/60 bg-muted/40 shadow-sm transition-all focus-within:border-primary/30 focus-within:bg-background focus-within:shadow-md focus-within:ring-1 focus-within:ring-primary/10">
          <textarea
            ref={ref}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything... Supports LaTeX $x^2$, tools, code"
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <CpuIcon className="h-2.5 w-2.5" />xylaria-2-senoa-max
              </span>
              <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">Shift+Enter for new line</span>
            </div>
            {isLoading ? (
              <button onClick={onStop} className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive transition-all hover:bg-destructive/20 hover:scale-105" title="Stop">
                <SquareIcon className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <button onClick={onSend} disabled={!input.trim()} className={cn('flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:scale-105 active:scale-95', !input.trim() && 'opacity-30 cursor-not-allowed')} title="Send">
                <SendIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground/40 tracking-wide">Xylaria is an AI and can make mistakes, please double check info</p>
      </div>
    </div>
  );
}
