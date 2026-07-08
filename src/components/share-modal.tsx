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
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <h3 className="text-[14px] font-semibold">Share chat</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">Chat title</div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-[13px] truncate">{chat.title}</div>
          </div>

          {/* Markdown export */}
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">Export as Markdown</div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-accent transition-colors"
              >
                {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy markdown'}
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-accent transition-colors"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                Download .md
              </button>
            </div>
          </div>

          {/* Shareable link */}
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">Shareable link</div>
            {!shareLink ? (
              <button
                onClick={handleMakeShareLink}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-accent transition-colors"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Generate link
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareLink}
                  className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] font-mono outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={handleCopyLink}
                  className={cn('flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-accent transition-colors')}
                >
                  {linkCopied ? <CheckIcon className="h-3.5 w-3.5 text-green-600" /> : <CopyIcon className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">
              The link encodes the entire conversation in the URL hash — no server needed. Very long chats may exceed URL length limits.
            </p>
          </div>

          {/* Preview */}
          <details>
            <summary className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground">
              <FileTextIcon className="h-3.5 w-3.5" />
              Preview markdown
            </summary>
            <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-[11px] font-mono whitespace-pre-wrap">{markdown.slice(0, 2000)}{markdown.length > 2000 ? '\n... (truncated)' : ''}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
