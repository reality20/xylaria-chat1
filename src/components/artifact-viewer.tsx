'use client';

import { useState, useEffect } from 'react';
import { XIcon, CopyIcon, CheckIcon, PlayIcon, CodeIcon, GlobeIcon, PaletteIcon, ImageIcon, DownloadIcon, MaximizeIcon, FileTextIcon } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isOpen || !artifact) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let mime = 'text/plain';
    let ext = 'txt';
    if (artifact.type === 'html') { mime = 'text/html'; ext = 'html'; }
    else if (artifact.type === 'svg') { mime = 'image/svg+xml'; ext = 'svg'; }
    else if (artifact.language === 'javascript' || artifact.language === 'js') { mime = 'text/javascript'; ext = 'js'; }
    else if (artifact.language === 'python' || artifact.language === 'py') { mime = 'text/x-python'; ext = 'py'; }
    else if (artifact.language === 'markdown' || artifact.language === 'md') { mime = 'text/markdown'; ext = 'md'; }
    else if (artifact.language === 'json') { mime = 'application/json'; ext = 'json'; }
    else if (artifact.language) ext = artifact.language;
    const blob = new Blob([artifact.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${artifact.title.replace(/\s+/g, '-').toLowerCase()}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = () => {
    if (!artifact.imageUrl) return;
    const a = document.createElement('a');
    a.href = artifact.imageUrl; a.download = `${artifact.title.replace(/\s+/g, '-').toLowerCase()}.png`; a.target = '_blank'; a.click();
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

  const IconComp = artifact.type === 'html' ? GlobeIcon : artifact.type === 'svg' ? PaletteIcon : artifact.type === 'image' ? ImageIcon : artifact.type === 'document' ? FileTextIcon : CodeIcon;
  const isJS = artifact.language === 'javascript' || artifact.language === 'js';
  const hasPreview = artifact.type === 'html' || artifact.type === 'svg' || artifact.type === 'image' || artifact.type === 'document';

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && <div className="fixed inset-0 z-[60] modal-overlay" onClick={onClose} />}

      <div className={cn(
        'flex flex-col border-l border-border/40 bg-background/80 backdrop-blur-xl animate-in slide-in-from-right-4 duration-300 z-[70]',
        isMobile
          ? 'fixed inset-0 z-[70]'
          : 'h-full w-[45%] min-w-[380px] max-w-[700px]'
      )}>
        {/* Glass header */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-3 sm:px-4 bg-background/40 backdrop-blur-xl">
          <div className="flex items-center gap-2 min-w-0">
            <IconComp className="h-4 w-4 text-primary/70 shrink-0" />
            <span className="truncate text-[13px] font-medium text-foreground">{artifact.title}</span>
            {artifact.language && (
              <span className="hidden sm:inline-flex rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">{artifact.language}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {hasPreview && artifact.type !== 'image' && artifact.type !== 'document' && (
              <div className="flex rounded-lg border border-border/40 bg-white/[0.03] p-0.5 mr-1 backdrop-blur-sm">
                <button onClick={() => setTab('preview')} className={cn(
                  'rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-all duration-200',
                  tab === 'preview'
                    ? 'bg-primary/15 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.1)]'
                    : 'text-muted-foreground/60 hover:text-foreground/80'
                )}>Preview</button>
                <button onClick={() => setTab('code')} className={cn(
                  'rounded-md px-2.5 py-0.5 text-[11px] font-medium transition-all duration-200',
                  tab === 'code'
                    ? 'bg-primary/15 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.1)]'
                    : 'text-muted-foreground/60 hover:text-foreground/80'
                )}>Code</button>
              </div>
            )}
            {isJS && (
              <button onClick={handleRun} className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 mr-1" title="Run">
                <PlayIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {artifact.type === 'image' && (
              <button onClick={handleDownloadImage} className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all duration-200 mr-1" title="Download">
                <DownloadIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {artifact.type !== 'image' && (
              <button onClick={handleDownload} className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all duration-200 mr-1" title="Download">
                <DownloadIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {artifact.type !== 'image' && (
              <button onClick={handleCopy} className={cn(
                'rounded-lg p-1.5 transition-all duration-200 mr-1',
                copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground/60 hover:text-primary hover:bg-primary/5'
              )} title="Copy">
                {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-white/5 transition-all duration-200">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {artifact.type === 'image' && artifact.imageUrl ? (
            <div className="flex h-full flex-col items-center justify-center bg-[#0a0a0a] p-4">
              <img src={artifact.imageUrl} alt={artifact.title} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
              <a href={artifact.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] text-primary/80 hover:text-primary transition-colors duration-200">
                <MaximizeIcon className="h-3 w-3" /> Open original
              </a>
            </div>
          ) : artifact.type === 'html' && tab === 'preview' ? (
            <iframe srcDoc={artifact.content} className="h-full w-full border-0" sandbox="allow-scripts allow-modals allow-forms allow-popups" title={artifact.title} />
          ) : artifact.type === 'svg' && tab === 'preview' ? (
            <div className="flex h-full items-center justify-center bg-[#0d0d0d] p-8 overflow-auto">
              <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
            </div>
          ) : artifact.type === 'document' ? (
            <div className="h-full overflow-y-auto bg-[#0d0d0d] p-6 sm:p-10">
              <article className="mx-auto max-w-2xl prose prose-sm dark:prose-invert">
                <DocumentRenderer content={artifact.content} />
              </article>
            </div>
          ) : (
            <pre className="h-full overflow-auto p-3 sm:p-4 font-mono text-[12px] sm:text-[13px] leading-relaxed bg-[#0a0a0b] text-[#d4d4d8]">
              <code>{artifact.content}</code>
            </pre>
          )}
        </div>

        {/* JS Output */}
        {isJS && execOutput && (
          <div className="h-32 shrink-0 border-t border-border/30 bg-[#060608] p-3 overflow-y-auto font-mono text-[12px]">
            <div className="text-primary/40 mb-1 text-[10px] font-semibold uppercase tracking-wider">Output</div>
            <pre className="text-[#d4d4d8] whitespace-pre-wrap">{execOutput}</pre>
          </div>
        )}
      </div>
    </>
  );
}

// Minimal markdown-to-JSX renderer for document artifacts.
function DocumentRenderer({ content }: { content: string }) {
  // Reuse the same MarkdownRenderer that the chat uses.
  // Lazy import to avoid circular deps at module load time.
  const [MarkdownRenderer, setMarkdownRenderer] = useState<React.ComponentType<{ content: string }> | null>(null);
  useEffect(() => {
    import('@/components/markdown/markdown-renderer').then((m) => setMarkdownRenderer(() => m.MarkdownRenderer));
  }, []);
  if (!MarkdownRenderer) return <pre className="whitespace-pre-wrap text-foreground/60">{content}</pre>;
  return <MarkdownRenderer content={content} />;
}