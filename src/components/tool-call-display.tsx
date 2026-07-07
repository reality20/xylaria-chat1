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
    <div className="shrink-0 border-b border-border/60 bg-muted/40">
      <div className="mx-auto max-w-3xl px-4 py-2">
        <div className="flex items-center gap-1.5 mb-1.5">
          <WrenchIcon className="h-3 w-3 text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Tool Calls</span>
          {active.some((a) => a.status === 'running') && (
            <Loader2Icon className="h-2.5 w-2.5 animate-spin text-primary ml-1" />
          )}
        </div>

        {/* Active tool calls */}
        {active.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {active.map((tc, i) => (
              <span
                key={`${tc.name}-${i}`}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border transition-all',
                  tc.status === 'running' && 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700',
                  tc.status === 'done' && 'border-green-500/30 bg-green-500/10 text-green-700',
                  tc.status === 'error' && 'border-red-500/30 bg-red-500/10 text-red-700'
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
              <details key={i} className="group rounded-md bg-background/60 border border-border/40">
                <summary className="flex items-center gap-1.5 px-2 py-1 cursor-pointer text-[10px] select-none">
                  {h.error ? <AlertCircleIcon className="h-2.5 w-2.5 text-red-500" /> : <CheckCircle2Icon className="h-2.5 w-2.5 text-green-500" />}
                  <span className="font-medium">{h.name}</span>
                  <span className="text-muted-foreground truncate max-w-[200px]">{h.input}</span>
                </summary>
                <pre className="px-2 pb-1.5 text-[10px] text-muted-foreground overflow-x-auto max-h-24">{h.output}</pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
