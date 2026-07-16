'use client';

import { useState } from 'react';
import {
  XIcon, DownloadIcon, UploadIcon, Trash2Icon, BrainIcon, PlugIcon, ServerIcon,
  PaletteIcon, SparklesIcon, DatabaseIcon, AlertTriangleIcon, SlidersIcon,
  BookOpenIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Settings, MemoryEntry, Connector, MCPServer, Tool } from '@/types';
import { CHAT_MODES } from '@/types';
import { exportData, importData } from '@/lib/settings';
import { addConnector, removeConnector, EXAMPLE_CONNECTORS } from '@/lib/connectors/registry';
import { addMCPServer, removeMCPServer } from '@/lib/mcp/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (s: Partial<Settings>) => void;
  connectors: Connector[];
  onRefreshConnectors: () => void;
  mcpServers: MCPServer[];
  onRefreshMCP: () => void;
  memories: MemoryEntry[];
  onClearMemories: () => void;
  tools: Tool[];
}

type Tab = 'general' | 'modes' | 'tools' | 'connectors' | 'mcp' | 'memory' | 'data' | 'about';

const KEYBOARD_SHORTCUTS = [
  { keys: '⌘ K', label: 'Open command palette' },
  { keys: '⌘ /', label: 'Toggle sidebar' },
  { keys: '⌘ B', label: 'Toggle sidebar (alt)' },
  { keys: '⌘ ,', label: 'Open settings' },
  { keys: '⌘ J', label: 'New chat' },
  { keys: 'Enter', label: 'Send message' },
  { keys: 'Shift + Enter', label: 'New line' },
  { keys: 'Esc', label: 'Close artifact panel' },
];

export function SettingsModal({ isOpen, onClose, settings, onUpdate, connectors, onRefreshConnectors, mcpServers, onRefreshMCP, memories, onClearMemories, tools }: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cMethod, setCMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [cUrl, setCUrl] = useState('');

  const [mName, setMName] = useState('');
  const [mUrl, setMUrl] = useState('');

  if (!isOpen) return null;

  const handleExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `xylaria-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { importData(reader.result as string); window.location.reload(); } catch { alert('Invalid backup file'); } };
    reader.readAsText(file);
  };

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'general', label: 'General', icon: PaletteIcon },
    { id: 'modes', label: 'Modes & Tools', icon: SlidersIcon },
    { id: 'tools', label: 'Built-in Tools', icon: SparklesIcon },
    { id: 'connectors', label: 'Connectors', icon: PlugIcon },
    { id: 'mcp', label: 'MCP Servers', icon: ServerIcon },
    { id: 'memory', label: 'Memory', icon: BrainIcon },
    { id: 'data', label: 'Data', icon: DatabaseIcon },
    { id: 'about', label: 'About', icon: BookOpenIcon },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center modal-overlay" onClick={onClose}>
      <div className="flex h-[85vh] w-[800px] max-w-[95vw] overflow-hidden glass-strong rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="w-52 shrink-0 border-r border-border/40 bg-background/30 hidden sm:block backdrop-blur-md">
          <div className="flex h-12 items-center justify-between px-4 border-b border-border/40">
            <span className="text-sm font-semibold text-foreground">Settings</span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <nav className="p-2 space-y-0.5 max-h-[calc(85vh-3rem)] overflow-y-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-200',
                  tab === t.id
                    ? 'bg-primary/10 text-primary font-medium shadow-[0_0_12px_hsl(var(--primary)/0.08)]'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile tab bar */}
        <div className="sm:hidden absolute top-0 left-0 right-0 flex overflow-x-auto border-b border-border/40 bg-background/60 backdrop-blur-xl z-10 rounded-t-2xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'whitespace-nowrap px-3 py-2 text-[12px] transition-all duration-200 border-b-2',
                tab === t.id
                  ? 'border-primary text-primary font-medium shadow-[0_1px_8px_hsl(var(--primary)/0.15)]'
                  : 'border-transparent text-muted-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pt-12 sm:pt-0">
          <div className="flex items-center justify-between sm:hidden px-4 py-2 border-b border-border/40">
            <span className="text-sm font-semibold text-foreground">Settings</span>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200">
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {tab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">General</h3>
                  <div className="accent-line mt-2" />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block text-foreground/90">Theme</label>
                    <div className="flex gap-2">
                      {(['system', 'light', 'dark'] as const).map((t) => (
                        <button key={t} onClick={() => onUpdate({ theme: t })} className={cn(
                          'rounded-lg border px-3 py-1.5 text-[12px] capitalize transition-all duration-200',
                          settings.theme === t
                            ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.1)]'
                            : 'border-border/50 bg-white/5 text-foreground/70 hover:bg-white/10 hover:border-border'
                        )}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block text-foreground/90">Font size</label>
                    <div className="flex gap-2">
                      {(['sm', 'md', 'lg'] as const).map((s) => (
                        <button key={s} onClick={() => onUpdate({ fontSize: s })} className={cn(
                          'rounded-lg border px-3 py-1.5 text-[12px] uppercase transition-all duration-200',
                          settings.fontSize === s
                            ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.1)]'
                            : 'border-border/50 bg-white/5 text-foreground/70 hover:bg-white/10 hover:border-border'
                        )}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block text-foreground/90">Display Name</label>
                    <input value={settings.customName} onChange={(e) => onUpdate({ customName: e.target.value })} className="w-full rounded-lg border border-border/50 bg-white/5 px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200" />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block text-foreground/90">Custom Instructions</label>
                    <textarea
                      value={settings.customInstructions}
                      onChange={(e) => onUpdate({ customInstructions: e.target.value })}
                      rows={3}
                      placeholder="e.g. I'm a software engineer. Always show code in TypeScript. Prefer functional style."
                      className="w-full resize-y rounded-lg border border-border/50 bg-white/5 px-3 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200"
                    />
                    <p className="text-[10px] text-muted-foreground/70 mt-1">These are appended to every system prompt.</p>
                  </div>
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block text-foreground/90">System Prompt</label>
                    <textarea value={settings.systemPrompt} onChange={(e) => onUpdate({ systemPrompt: e.target.value })} rows={6} className="w-full resize-y rounded-lg border border-border/50 bg-white/5 px-3 py-2 text-[12px] font-mono text-foreground outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200" />
                    <p className="text-[10px] text-muted-foreground/70 mt-1">Use {'{date}'}, {'{time}'}, {'{tools}'} for substitutions.</p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-foreground/90">Show tool calls</span>
                    <Toggle on={settings.showToolCalls} onClick={() => onUpdate({ showToolCalls: !settings.showToolCalls })} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-foreground/90">Stream responses</span>
                    <Toggle on={settings.streamEnabled} onClick={() => onUpdate({ streamEnabled: !settings.streamEnabled })} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-foreground/90">Sound effects</span>
                    <Toggle on={settings.soundEnabled} onClick={() => onUpdate({ soundEnabled: !settings.soundEnabled })} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'modes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Default chat mode</h3>
                  <div className="accent-line mt-2" />
                  <p className="text-[11px] text-muted-foreground/80 mt-2">Pick the mode that loads when you start a new chat. You can still switch modes in the input bar.</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {CHAT_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onUpdate({ defaultMode: m.id })}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3 text-left transition-all duration-200',
                        settings.defaultMode === m.id
                          ? 'border-primary/30 bg-primary/5 shadow-[0_0_16px_hsl(var(--primary)/0.06)]'
                          : 'border-border/40 bg-white/[0.02] hover:bg-white/[0.05] hover:border-border/60'
                      )}
                    >
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-foreground">{m.label}</div>
                        <div className="text-[11px] text-muted-foreground/80">{m.description}</div>
                        <div className="text-[10px] text-muted-foreground/50 mt-1">Temperature: {m.temperature}</div>
                      </div>
                      {settings.defaultMode === m.id && <CheckMark />}
                    </button>
                  ))}
                </div>

                <div className="border-t border-border/30 pt-4">
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Feature toggles</h4>
                  <div className="space-y-2">
                    <ToggleRow label="Artifacts panel" desc="Open code, HTML, SVG, and images in a side panel" on={settings.enableArtifacts} onClick={() => onUpdate({ enableArtifacts: !settings.enableArtifacts })} />
                    <ToggleRow label="Iris v1.5 image generation" desc="Allow the AI to generate images via Iris (FLUX.2)" on={settings.enableIris} onClick={() => onUpdate({ enableIris: !settings.enableIris })} />
                    <ToggleRow label="Web search" desc="Let the AI search the web for current info" on={settings.enableWebSearch} onClick={() => onUpdate({ enableWebSearch: !settings.enableWebSearch })} />
                    <ToggleRow label="Persistent memory" desc="Remember facts about you across chats" on={settings.enableMemory} onClick={() => onUpdate({ enableMemory: !settings.enableMemory })} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'tools' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Available Tools ({tools.length})</h3>
                  <div className="accent-line mt-2" />
                </div>
                <div className="space-y-2">
                  {tools.map((t) => (
                    <div key={t.name} className="rounded-xl border border-border/40 bg-white/[0.03] px-3 py-2.5 backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.05] hover:border-border/60">
                      <div className="flex items-center gap-2">
                        <div className="text-[13px] font-medium font-mono text-foreground">{t.name}</div>
                        {t.name === 'iris_image_gen' && (
                          <span className="rounded-md bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-purple-400">Iris v1.5</span>
                        )}
                        {t.name === 'svg_generator' && (
                          <span className="rounded-md bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-400">Artifact</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground/80 mt-0.5">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'connectors' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Custom Connectors</h3>
                  <div className="accent-line mt-2" />
                </div>
                <div className="space-y-2">
                  <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200" />
                  <input value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Description" className="w-full rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200" />
                  <div className="flex gap-2">
                    <select value={cMethod} onChange={(e) => setCMethod(e.target.value as 'GET')} className="rounded-lg border border-border/50 bg-white/5 px-2 py-1.5 text-[12px] text-foreground outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200">
                      <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                    </select>
                    <input value={cUrl} onChange={(e) => setCUrl(e.target.value)} placeholder="URL" className="flex-1 rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200" />
                  </div>
                  <button onClick={() => { if (cName && cUrl) { addConnector({ name: cName, description: cDesc || cName, type: 'api', method: cMethod, url: cUrl, parameters: { type: 'object', properties: {} } }); setCName(''); setCDesc(''); setCUrl(''); onRefreshConnectors(); } }} className="btn-primary-gradient rounded-lg px-3 py-1.5 text-[12px] font-medium">Add Connector</button>
                </div>
                {connectors.length > 0 && (
                  <div className="space-y-1.5">
                    {connectors.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-white/[0.03] px-3 py-2 transition-all duration-200 hover:bg-white/[0.05]">
                        <div>
                          <div className="text-[12px] font-medium text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground/70">{c.method} {c.url}</div>
                        </div>
                        <button onClick={() => { removeConnector(c.id); onRefreshConnectors(); }} className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"><Trash2Icon className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {connectors.length === 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground/70">No custom connectors. Try an example:</p>
                    {EXAMPLE_CONNECTORS.map((ex, i) => (
                      <button key={i} onClick={() => { addConnector(ex); onRefreshConnectors(); }} className="w-full text-left rounded-xl border border-dashed border-border/50 px-3 py-2 text-[11px] text-muted-foreground/70 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200">
                        + {ex.name}: {ex.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'mcp' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">MCP Servers</h3>
                  <div className="accent-line mt-2" />
                </div>
                <p className="text-[11px] text-muted-foreground/80">Connect to Model Context Protocol servers for external tools. The FLUX.2-Klein-Multi-LoRA image generator is built in as the <strong className="text-foreground/90">Iris v1.5</strong> tool — no MCP setup required.</p>
                <div className="space-y-2">
                  <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Server name" className="w-full rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200" />
                  <input value={mUrl} onChange={(e) => setMUrl(e.target.value)} placeholder="URL (e.g. https://mcp.example.com)" className="w-full rounded-lg border border-border/50 bg-white/5 px-3 py-1.5 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all duration-200" />
                  <button onClick={() => { if (mName && mUrl) { addMCPServer({ name: mName, command: mUrl, args: [] }); setMName(''); setMUrl(''); onRefreshMCP(); } }} className="btn-primary-gradient rounded-lg px-3 py-1.5 text-[12px] font-medium">Add MCP Server</button>
                </div>
                {mcpServers.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border/40 bg-white/[0.03] px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.05]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-2 w-2 rounded-full', s.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_6px_hsl(160_80%50%/0.4)]' : s.status === 'error' ? 'bg-red-400 shadow-[0_0_6px_hsl(0_80%50%/0.4)]' : 'bg-amber-400 shadow-[0_0_6px_hsl(40_80%50%/0.4)]')} />
                        <span className="text-[12px] font-medium text-foreground">{s.name}</span>
                      </div>
                      <button onClick={() => { removeMCPServer(s.id); onRefreshMCP(); }} className="rounded-lg p-1.5 text-muted-foreground/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"><Trash2Icon className="h-3 w-3" /></button>
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">{s.command}</div>
                    {s.tools && s.tools.length > 0 && <div className="text-[10px] text-muted-foreground/70 mt-1">{s.tools.length} tools</div>}
                  </div>
                ))}
              </div>
            )}

            {tab === 'memory' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Stored Memories ({memories.length})</h3>
                  <div className="accent-line mt-2" />
                </div>
                <p className="text-[11px] text-muted-foreground/80">Facts the AI has stored about you across chats.</p>
                {memories.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground/70">No memories stored yet. Tell the AI "remember that I prefer..." and it will save it here.</p>
                ) : (
                  <div className="space-y-1.5">
                    {memories.map((m) => (
                      <div key={m.key} className="flex items-center justify-between rounded-xl border border-border/40 bg-white/[0.03] px-3 py-2 transition-all duration-200 hover:bg-white/[0.05]">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium text-foreground truncate">{m.key}</div>
                          <div className="text-[11px] text-muted-foreground/70 truncate">{m.value}</div>
                          <div className="text-[10px] text-muted-foreground/40 mt-0.5">{new Date(m.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {memories.length > 0 && (
                  <button onClick={() => setShowClearConfirm(true)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-[12px] text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-200">
                    Clear All Memories
                  </button>
                )}
              </div>
            )}

            {tab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Data Management</h3>
                  <div className="accent-line mt-2" />
                </div>
                <div className="space-y-3">
                  <button onClick={handleExport} className="btn-glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] text-foreground w-full">
                    <DownloadIcon className="h-4 w-4 text-primary" /> Export All Data (JSON)
                  </button>
                  <label className="btn-glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] text-foreground cursor-pointer w-full">
                    <UploadIcon className="h-4 w-4 text-primary" /> Import Data
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>
                <div className="border-t border-border/30 pt-4">
                  <h4 className="text-sm font-semibold mb-2 text-foreground">Keyboard shortcuts</h4>
                  <div className="space-y-1">
                    {KEYBOARD_SHORTCUTS.map((s) => (
                      <div key={s.keys} className="flex items-center justify-between text-[12px]">
                        <span className="text-muted-foreground/80">{s.label}</span>
                        <kbd className="rounded-md border border-border/40 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-muted-foreground/70">{s.keys}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'about' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <img src="/xylaria-logo.png" alt="" className="h-12 w-12 rounded-xl object-contain shadow-lg" />
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Xylaria</h3>
                    <p className="text-[12px] text-muted-foreground/80">Agentic AI chat · v3.0</p>
                  </div>
                </div>
                <p className="text-[12px] leading-relaxed text-muted-foreground/80">
                  Xylaria is a fully client-side agentic AI chatbot. All chats, settings, and memories live in your browser's localStorage — no account, no server, no tracking. The model is <code className="rounded-md bg-white/5 border border-border/30 px-1.5 py-0.5 text-[11px] text-primary/90">xylaria-2-senoa-max</code> with tool-calling via prompt injection.
                </p>
                <div className="space-y-2">
                  <h4 className="text-[13px] font-semibold text-foreground">Highlights</h4>
                  <ul className="space-y-1 text-[12px] text-muted-foreground/80">
                    <li>• <strong className="text-foreground/90">Iris v1.5</strong> image generator (FLUX.2-Klein-Multi-LoRA)</li>
                    <li>• Web & image search via Wikipedia, Openverse, DuckDuckGo, Bing</li>
                    <li>• Artifact viewer for code, HTML, SVG, and images</li>
                    <li>• 5 chat modes: Fast, Balanced, Creative, Precise, Research</li>
                    <li>• Markdown, LaTeX, syntax-highlighted code, tables</li>
                    <li>• Voice input (Web Speech API) and file attachments</li>
                    <li>• Chat pinning, forking, renaming, and export</li>
                    <li>• Command palette (⌘K) and 8 keyboard shortcuts</li>
                    <li>• MCP server support and custom HTTP connectors</li>
                    <li>• Persistent memory across conversations</li>
                  </ul>
                </div>
                <div className="border-t border-border/30 pt-4">
                  <h4 className="text-[13px] font-semibold mb-2 text-foreground">Tech</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {['React 19', 'TypeScript', 'Vite', 'Tailwind', 'shadcn/ui', 'KaTeX', 'Lucide'].map((t) => (
                      <span key={t} className="rounded-md bg-white/5 border border-border/30 px-2 py-0.5 text-[10px] text-muted-foreground/70">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Memory Confirm */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="glass-strong rounded-2xl p-5 shadow-2xl max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangleIcon className="h-5 w-5 text-red-400" />
              <h4 className="font-semibold text-sm text-foreground">Clear All Memories?</h4>
            </div>
            <p className="text-[12px] text-muted-foreground/80 mb-4">This will permanently delete all stored memories. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="btn-glass rounded-lg px-3 py-1.5 text-[12px] text-foreground transition-all duration-200">Cancel</button>
              <button onClick={() => { onClearMemories(); setShowClearConfirm(false); }} className="rounded-lg bg-red-500/80 px-3 py-1.5 text-[12px] text-white hover:bg-red-500 transition-all duration-200">Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn('h-5 w-9 rounded-full transition-all duration-200 relative', on ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)]' : 'bg-white/10 border border-border/40')}>
      <div className={cn('h-4 w-4 rounded-full bg-background shadow-sm transition-all duration-200 absolute top-0.5 left-0.5', on && 'translate-x-4 bg-white')} />
    </button>
  );
}

function ToggleRow({ label, desc, on, onClick }: { label: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-white/[0.02] px-3 py-2.5 transition-all duration-200 hover:bg-white/[0.04]">
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground/70">{desc}</div>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}

function CheckMark() {
  return (
    <svg className="h-4 w-4 text-primary shrink-0 drop-shadow-[0_0_4px_hsl(var(--primary)/0.4)]" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}