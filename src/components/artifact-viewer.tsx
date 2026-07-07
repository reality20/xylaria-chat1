'use client';

import { useState } from 'react';
import { XIcon, CopyIcon, CheckIcon, PlayIcon, CodeIcon, GlobeIcon, PaletteIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Artifact } from '@/types';

interface Props {
  artifact: Artifact | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ArtifactViewer({ artifact, isOpen, onClose }: Props) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [execOutput, setExecOutput] = useState('');

  if (!isOpen || !artifact) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    setExecOutput('Running...');
    try {
      const logs: string[] = [];
      const origLog = console.log;
      console.log = (...args: unknown[]) => logs.push(args.map((a) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      const fn = new Function('console', 'Math', 'JSON', 'Date', 'Array', 'Object', 'String', 'Number', 'Promise', 'URL', 'crypto', 'setTimeout', 'clearTimeout',
        `return (async () => { ${artifact.content} })()`
      );
      fn(console, Math, JSON, Date, Array, Object, String, Number, Promise, URL, crypto, setTimeout, clearTimeout);
      console.log = origLog;
      setExecOutput(logs.join('\n') || 'Done (no output)');
    } catch (e) {
      setExecOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const IconComp = artifact.type === 'html' ? GlobeIcon : artifact.type === 'svg' ? PaletteIcon : CodeIcon;
  const isJS = artifact.language === 'javascript' || artifact.language === 'js';

  return (
    <div className="flex h-full w-[45%] min-w-[380px] flex-col border-l border-border bg-background animate-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex h-11 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2 min-w-0">
          <IconComp className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate text-[13px] font-medium">{artifact.title}</span>
          {artifact.language && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{artifact.language}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {artifact.type === 'html' && (
            <div className="flex rounded-lg border border-border bg-muted p-0.5 mr-1">
              <button onClick={() => setTab('preview')} className={cn('rounded-md px-2.5 py-0.5 text-[11px] font-medium', tab === 'preview' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>Preview</button>
              <button onClick={() => setTab('code')} className={cn('rounded-md px-2.5 py-0.5 text-[11px] font-medium', tab === 'code' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>Code</button>
            </div>
          )}
          {isJS && (
            <button onClick={handleRun} className="rounded-lg p-1.5 text-green-600 hover:bg-green-500/10 transition-colors mr-1" title="Run">
              <PlayIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={handleCopy} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors" title="Copy">
            {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {artifact.type === 'html' && tab === 'preview' ? (
          <iframe srcDoc={artifact.content} className="h-full w-full border-0" sandbox="allow-scripts" title={artifact.title} />
        ) : artifact.type === 'svg' ? (
          <div className="flex h-full items-center justify-center bg-white p-8">
            <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
          </div>
        ) : (
          <pre className="h-full overflow-auto p-4 font-mono text-[13px] leading-relaxed bg-[#1e1e1e] text-[#d4d4d4]">
            <code>{artifact.content}</code>
          </pre>
        )}
      </div>

      {/* JS Output */}
      {isJS && execOutput && (
        <div className="h-32 shrink-0 border-t border-border bg-black p-3 overflow-y-auto font-mono text-[12px]">
          <div className="text-white/50 mb-1 text-[10px]">Output</div>
          <pre className="text-[#d4d4d4] whitespace-pre-wrap">{execOutput}</pre>
        </div>
      )}
    </div>
  );
}
