'use client';

import { useRef, useEffect, useState } from 'react';
import {
  SendIcon, SquareIcon, PaperclipIcon, MicIcon, XIcon,
  ChevronDownIcon, ZapIcon, ScaleIcon, SparklesIcon, TargetIcon, MicroscopeIcon,
  ImageIcon, GlobeIcon, SearchIcon, CodeIcon, BrainIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMode } from '@/types';
import { CHAT_MODES } from '@/types';

interface Props {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  status: string;
  mode: ChatMode;
  onModeChange: (m: ChatMode) => void;
  onAttachFiles?: (files: File[]) => void;
}

const MODE_ICONS: Record<ChatMode, React.ComponentType<{ className?: string }>> = {
  fast: ZapIcon,
  balanced: ScaleIcon,
  creative: SparklesIcon,
  precise: TargetIcon,
  research: MicroscopeIcon,
};

export function ChatInput({ input, onInputChange, onSend, onStop, status, mode, onModeChange, onAttachFiles }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const isBusy = status === 'submitted' || status === 'streaming' || status === 'tool-calling';

  // Auto-grow textarea.
  useEffect(() => {
    if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = `${Math.min(ref.current.scrollHeight, 200)}px`; }
  }, [input]);

  // Close mode picker on outside click.
  useEffect(() => {
    if (!showModePicker) return;
    const handler = () => setShowModePicker(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [showModePicker]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!isBusy && input.trim()) onSend(); }
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const s = el.selectionStart;
      onInputChange(input.slice(0, s) + '  ' + input.slice(el.selectionEnd));
      setTimeout(() => { el.selectionStart = el.selectionEnd = s + 2; }, 0);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !onAttachFiles) return;
    const arr = Array.from(files).slice(0, 5);
    setAttachments((prev) => [...prev, ...arr]);
    onAttachFiles(arr);
  };

  const removeAttachment = (i: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Voice input via Web Speech API.
  const handleVoice = () => {
    type SpeechRecognitionLike = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      stop: () => void;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    };
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
            || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported in this browser. Try Chrome or Edge.'); return; }
    if (isRecording) return;
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setIsRecording(true);
    let finalText = '';
    rec.onresult = (e) => { finalText = e.results[0][0].transcript; };
    rec.onend = () => {
      setIsRecording(false);
      if (finalText) onInputChange(input ? input + ' ' + finalText : finalText);
    };
    rec.onerror = () => setIsRecording(false);
    rec.start();
  };

  const ModeIcon = MODE_ICONS[mode];
  const currentMode = CHAT_MODES.find((m) => m.id === mode) || CHAT_MODES[1];

  // Quick action chips — append a prefix to the input.
  const quickActions = [
    { icon: ImageIcon, label: 'Image', prefix: 'Generate an image: ' },
    { icon: SearchIcon, label: 'Search', prefix: 'Search the web for: ' },
    { icon: CodeIcon, label: 'Code', prefix: 'Write code: ' },
    { icon: GlobeIcon, label: 'Fetch', prefix: 'Fetch and summarize: ' },
    { icon: BrainIcon, label: 'Explain', prefix: 'Explain in simple terms: ' },
  ];

  return (
    <div className="shrink-0 glass-strong">
      {/* Accent line at top */}
      <div className="accent-line" />

      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3 sm:py-4">
        {/* Quick actions row — only show when input is empty */}
        {!input.trim() && attachments.length === 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => onInputChange(qa.prefix)}
                className="action-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                  <qa.icon className="h-2.5 w-2.5 text-primary/80" />
                </span>
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map((f, i) => (
              <div
                key={i}
                className="glass inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground"
              >
                <PaperclipIcon className="h-3 w-3 text-primary/60" />
                <span className="max-w-[120px] truncate text-foreground/80">{f.name}</span>
                <span className="text-muted-foreground/50">{(f.size / 1024).toFixed(1)}KB</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="ml-0.5 text-muted-foreground/50 transition-colors hover:text-destructive"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main input wrapper with glow on focus */}
        <div className="input-glow rounded-2xl border border-border/40 bg-gradient-input">
          <textarea
            ref={ref}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything..."
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3.5 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground/45 outline-none"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between gap-1.5 px-2.5 sm:px-3 pb-2.5">
            <div className="flex items-center gap-1 min-w-0">
              {/* Mode picker */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowModePicker(!showModePicker)}
                  className={cn(
                    'glass inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] sm:text-[11px] font-medium transition-all',
                    'hover:bg-card hover:border-primary/25',
                    mode && 'border-primary/20 bg-primary/8 text-primary'
                  )}
                  title="Chat mode"
                >
                  <ModeIcon className="h-3 w-3 sm:h-3 sm:w-3" />
                  <span className="hidden sm:inline">{currentMode.label}</span>
                  <ChevronDownIcon className="h-2.5 w-2.5 opacity-60" />
                </button>

                {/* Mode dropdown */}
                {showModePicker && (
                  <div className="glass-strong absolute bottom-full left-0 mb-1.5 w-60 rounded-xl p-1.5 shadow-2xl shadow-black/40 z-50">
                    {CHAT_MODES.map((m) => {
                      const Icon = MODE_ICONS[m.id];
                      const isActive = m.id === mode;
                      return (
                        <button
                          key={m.id}
                          onClick={() => { onModeChange(m.id); setShowModePicker(false); }}
                          className={cn(
                            'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all',
                            isActive
                              ? 'bg-primary/10 border border-primary/15'
                              : 'border border-transparent hover:bg-card/80'
                          )}
                        >
                          <Icon
                            className={cn(
                              'mt-0.5 h-4 w-4 shrink-0 transition-colors',
                              isActive ? 'text-primary' : 'text-muted-foreground/60'
                            )}
                          />
                          <div className="min-w-0">
                            <div className={cn(
                              'text-[12px] font-medium transition-colors',
                              isActive ? 'text-primary' : 'text-foreground/90'
                            )}>
                              {m.label}
                            </div>
                            <div className="text-[10px] text-muted-foreground/60 leading-snug mt-0.5">{m.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* File attach */}
              {onAttachFiles && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-glass flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/70 transition-all hover:text-foreground"
                  title="Attach files"
                >
                  <PaperclipIcon className="h-3.5 w-3.5" />
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
              />

              {/* Voice input */}
              <button
                onClick={handleVoice}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                  isRecording
                    ? 'bg-red-500/15 text-red-400 animate-pulse ring-1 ring-red-500/30'
                    : 'btn-glass text-muted-foreground/70 hover:text-foreground'
                )}
                title={isRecording ? 'Recording...' : 'Voice input'}
              >
                <MicIcon className="h-3.5 w-3.5" />
              </button>

              {/* Shift+Enter hint */}
              <span className="hidden lg:inline text-[10px] text-muted-foreground/30 ml-1 select-none tracking-wide">
                Shift+Enter ↵
              </span>
            </div>

            {/* Send / Stop button */}
            {isBusy ? (
              <button
                onClick={onStop}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-all',
                  'bg-destructive/10 text-destructive border border-destructive/15',
                  'hover:bg-destructive/20 hover:border-destructive/25 hover:scale-105'
                )}
                title="Stop"
              >
                <SquareIcon className="h-3 w-3 fill-current" />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!input.trim()}
                className={cn(
                  'btn-primary-gradient flex h-8 w-8 items-center justify-center rounded-xl',
                  !input.trim() && 'opacity-25 cursor-not-allowed hover:transform-none hover:shadow-none'
                )}
                title="Send"
              >
                <SendIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-2 text-center text-[10px] text-muted-foreground/30 tracking-wide select-none">
          Xylaria is an AI and can make mistakes — please verify important info
        </p>
      </div>
    </div>
  );
}