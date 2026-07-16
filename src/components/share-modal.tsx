'use client';

import { useState } from 'react';
import { XIcon, CopyIcon, CheckIcon, DownloadIcon, LinkIcon, FileTextIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Chat } from '@/types';

interface Props {
  chat: Chat;
  markdown: string;
  onClose: () => void;
}

export function ShareModal({ chat, markdown, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${chat.title.replace(/\s+/g, '-').toLowerCase()}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleMakeShareLink = () => {
    // Encode the chat into a URL hash. (Note: very long chats will exceed URL length limits.)
    try {
      const payload = JSON.stringify({ title: chat.title, messages: chat.messages.filter((m) => m.role !== 'tool').map((m) => ({ role: m.role, content: m.content })) });
      const encoded = btoa(unescape(encodeURIComponent(payload)));
      const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
      setShareLink(url);
    } catch {
      setShareLink('Error: chat too long to share as link');
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center modal-overlay px-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden glass-strong rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header with accent line */}
        <div className="flex h-11 shrink-0 items-center justify-between px-4">
          <h3 className="text-[14px] font-semibold text-foreground">Share chat</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground/70 hover:text-foreground hover:bg-white/5 transition-all duration-200">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="accent-line" />

        <div className="p-4 space-y-4">
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground/70">Chat title</div>
            <div className="rounded-xl border border-border/40 bg-white/[0.03] px-3 py-2 text-[13px] text-foreground truncate backdrop-blur-sm">{chat.title}</div>
          </div>

          {/* Markdown export */}
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground/70">Export as Markdown</div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyMarkdown}
                className={cn(
                  'btn-glass flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200',
                  copied ? 'border-emerald-500/30 text-emerald-400' : 'text-foreground/80'
                )}
              >
                {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy markdown'}
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="btn-glass flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-foreground/80 transition-all duration-200"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                Download .md
              </button>
            </div>
          </div>

          {/* Shareable link */}
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground/70">Shareable link</div>
            {!shareLink ? (
              <button
                onClick={handleMakeShareLink}
                className="btn-primary-gradient flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Generate link
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareLink}
                  className="flex-1 rounded-xl border border-border/40 bg-white/[0.03] px-3 py-2 text-[11px] font-mono text-foreground/80 outline-none backdrop-blur-sm focus:ring-1 focus:ring-primary/30 transition-all duration-200"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopyLink}
                  className={cn(
                    'btn-glass flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium transition-all duration-200',
                    linkCopied ? 'border-emerald-500/30 text-emerald-400' : 'text-foreground/80'
                  )}
                >
                  {linkCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-muted-foreground/50 leading-relaxed">
              The link encodes the entire conversation in the URL hash — no server needed. Very long chats may exceed URL length limits.
            </p>
          </div>

          {/* Preview */}
          <details>
            <summary className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors duration-200">
              <FileTextIcon className="h-3.5 w-3.5" />
              Preview markdown
            </summary>
            <pre className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border/30 bg-[#0d0d0d] p-3 text-[11px] font-mono text-foreground/60 whitespace-pre-wrap">{markdown.slice(0, 2000)}{markdown.length > 2000 ? '\n... (truncated)' : ''}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}