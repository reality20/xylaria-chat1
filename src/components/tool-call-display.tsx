'use client';

import { WrenchIcon, CheckCircle2Icon, AlertCircleIcon, Loader2Icon, ClockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCall {
  name: string;
  status: 'running' | 'done' | 'error';
  duration?: number;
}

interface Props {
  active: ToolCall[];
  history: Array<{ name: string; input: string; output: string; error: string | null }>;
  visible: boolean;
}

export function ToolCallDisplay({ active, history, visible }: Props) {
  if (!visible || (active.length === 0 && history.length === 0)) return null;

  return (
    <div className="shrink-0 border-b border-border/30 glass">
      <div className="mx-auto max-w-3xl px-4 py-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <WrenchIcon className="h-3 w-3 text-primary/70" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Tool Calls</span>
          {active.some((a) => a.status === 'running') && (
            <Loader2Icon className="h-2.5 w-2.5 animate-spin text-primary/70 ml-1" />
          )}
        </div>

        {/* Active tool calls */}
        {active.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {active.map((tc, i) => (
              <span
                key={`${tc.name}-${i}`}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium border backdrop-blur-sm transition-all duration-300',
                  tc.status === 'running' && 'border-teal-500/30 bg-teal-500/10 text-teal-300 shadow-[0_0_10px_hsl(175_70%45%/0.1)]',
                  tc.status === 'done' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                  tc.status === 'error' && 'border-red-500/30 bg-red-500/10 text-red-300'
                )}
              >
                {tc.status === 'running' && <Loader2Icon className="h-2.5 w-2.5 animate-spin" />}
                {tc.status === 'done' && <CheckCircle2Icon className="h-2.5 w-2.5" />}
                {tc.status === 'error' && <AlertCircleIcon className="h-2.5 w-2.5" />}
                {tc.name}
                {tc.duration && <ClockIcon className="h-2 w-2 ml-0.5 opacity-60" />}
              </span>
            ))}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-1">
            {history.map((h, i) => (
              <details key={i} className="group rounded-xl border border-border/30 bg-white/[0.02] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.04]">
                <summary className="flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer text-[10px] select-none">
                  {h.error ? <AlertCircleIcon className="h-2.5 w-2.5 text-red-400" /> : <CheckCircle2Icon className="h-2.5 w-2.5 text-emerald-400" />}
                  <span className="font-medium text-foreground/90">{h.name}</span>
                  <span className="text-muted-foreground/60 truncate max-w-[200px]">{h.input}</span>
                </summary>
                <pre className="px-2.5 pb-2 text-[10px] text-muted-foreground/60 overflow-x-auto max-h-24">{h.output}</pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}