'use client';

import { useState } from 'react';
import { XIcon, DownloadIcon, UploadIcon, Trash2Icon, BrainIcon, PlugIcon, ServerIcon, PaletteIcon, SparklesIcon, DatabaseIcon, AlertTriangleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Settings, MemoryEntry, Connector, MCPServer, Tool } from '@/types';
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

type Tab = 'general' | 'tools' | 'connectors' | 'mcp' | 'memory' | 'data';

export function SettingsModal({ isOpen, onClose, settings, onUpdate, connectors, onRefreshConnectors, mcpServers, onRefreshMCP, memories, onClearMemories, tools }: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // New connector form
  const [cName, setCName] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cMethod, setCMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [cUrl, setCUrl] = useState('');

  // New MCP form
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
    { id: 'tools', label: 'Built-in Tools', icon: SparklesIcon },
    { id: 'connectors', label: 'Connectors', icon: PlugIcon },
    { id: 'mcp', label: 'MCP Servers', icon: ServerIcon },
    { id: 'memory', label: 'Memory', icon: BrainIcon },
    { id: 'data', label: 'Data', icon: DatabaseIcon },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-[85vh] w-[800px] max-w-[95vw] overflow-hidden rounded-xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="w-52 shrink-0 border-r border-border bg-muted/30">
          <div className="flex h-12 items-center justify-between px-4 border-b border-border">
            <span className="text-sm font-semibold">Settings</span>
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <nav className="p-2 space-y-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors',
                  tab === t.id ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {tab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold">General Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block">Theme</label>
                    <div className="flex gap-2">
                      {(['system', 'light', 'dark'] as const).map((t) => (
                        <button key={t} onClick={() => onUpdate({ theme: t })} className={cn(
                          'rounded-lg border px-3 py-1.5 text-[12px] capitalize transition-colors',
                          settings.theme === t ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent'
                        )}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block">Display Name</label>
                    <input value={settings.customName} onChange={(e) => onUpdate({ customName: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-[13px] outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[13px] font-medium mb-1.5 block">System Prompt</label>
                    <textarea value={settings.systemPrompt} onChange={(e) => onUpdate({ systemPrompt: e.target.value })} rows={6} className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-[12px] font-mono outline-none focus:ring-1 focus:ring-primary" />
                    <p className="text-[10px] text-muted-foreground mt-1">Use {'{date}'} for current date, {'{tools}'} for tool list</p>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[13px]">Show Tool Calls</span>
                    <button onClick={() => onUpdate({ showToolCalls: !settings.showToolCalls })} className={cn(
                      'h-5 w-9 rounded-full transition-colors', settings.showToolCalls ? 'bg-primary' : 'bg-muted'
                    )}>
                      <div className={cn('h-4 w-4 rounded-full bg-background shadow-sm transition-transform ml-0.5', settings.showToolCalls && 'translate-x-4')} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'tools' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Available Tools ({tools.length})</h3>
                <div className="space-y-2">
                  {tools.map((t) => (
                    <div key={t.name} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                      <div className="text-[13px] font-medium">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground">{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'connectors' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Custom Connectors</h3>
                <div className="space-y-2">
                  <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Name" className="w-full rounded-lg border border-input px-3 py-1.5 text-[12px]" />
                  <input value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Description" className="w-full rounded-lg border border-input px-3 py-1.5 text-[12px]" />
                  <div className="flex gap-2">
                    <select value={cMethod} onChange={(e) => setCMethod(e.target.value as 'GET')} className="rounded-lg border border-input px-2 py-1.5 text-[12px]">
                      <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                    </select>
                    <input value={cUrl} onChange={(e) => setCUrl(e.target.value)} placeholder="URL" className="flex-1 rounded-lg border border-input px-3 py-1.5 text-[12px]" />
                  </div>
                  <button onClick={() => { if (cName && cUrl) { addConnector({ name: cName, description: cDesc || cName, method: cMethod, url: cUrl, parameters: { type: 'object', properties: {} } }); setCName(''); setCDesc(''); setCUrl(''); onRefreshConnectors(); } }} className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Add Connector</button>
                </div>
                {connectors.length > 0 && (
                  <div className="space-y-1.5">
                    {connectors.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <div>
                          <div className="text-[12px] font-medium">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground">{c.method} {c.url}</div>
                        </div>
                        <button onClick={() => { removeConnector(c.id); onRefreshConnectors(); }} className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2Icon className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {connectors.length === 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground">No custom connectors. Try an example:</p>
                    {EXAMPLE_CONNECTORS.map((ex, i) => (
                      <button key={i} onClick={() => { addConnector(ex); onRefreshConnectors(); }} className="w-full text-left rounded-lg border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                        + {ex.name}: {ex.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'mcp' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">MCP Servers</h3>
                <div className="space-y-2">
                  <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Server name" className="w-full rounded-lg border border-input px-3 py-1.5 text-[12px]" />
                  <input value={mUrl} onChange={(e) => setMUrl(e.target.value)} placeholder="URL (e.g. https://mcp.example.com)" className="w-full rounded-lg border border-input px-3 py-1.5 text-[12px]" />
                  <button onClick={() => { if (mName && mUrl) { addMCPServer({ name: mName, command: mUrl, args: [] }); setMName(''); setMUrl(''); onRefreshMCP(); } }} className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Add MCP Server</button>
                </div>
                {mcpServers.map((s) => (
                  <div key={s.id} className="rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('h-2 w-2 rounded-full', s.status === 'connected' ? 'bg-green-500' : s.status === 'error' ? 'bg-red-500' : 'bg-yellow-500')} />
                        <span className="text-[12px] font-medium">{s.name}</span>
                      </div>
                      <button onClick={() => { removeMCPServer(s.id); onRefreshMCP(); }} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2Icon className="h-3 w-3" /></button>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{s.command}</div>
                    {s.tools.length > 0 && <div className="text-[10px] text-muted-foreground mt-1">{s.tools.length} tools</div>}
                  </div>
                ))}
              </div>
            )}

            {tab === 'memory' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Stored Memories ({memories.length})</h3>
                {memories.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">No memories stored yet. The AI will store facts about you here.</p>
                ) : (
                  <div className="space-y-1.5">
                    {memories.map((m) => (
                      <div key={m.key} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium truncate">{m.key}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{m.value}</div>
                        </div>
                        <button onClick={() => { onClearMemories(); }} className="ml-2 rounded p-1 text-muted-foreground hover:text-destructive"><Trash2Icon className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {memories.length > 0 && (
                  <button onClick={() => setShowClearConfirm(true)} className="rounded-lg border border-destructive/30 px-3 py-1.5 text-[12px] text-destructive hover:bg-destructive/10 transition-colors">
                    Clear All Memories
                  </button>
                )}
              </div>
            )}

            {tab === 'data' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold">Data Management</h3>
                <div className="space-y-3">
                  <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] hover:bg-accent transition-colors w-full">
                    <DownloadIcon className="h-4 w-4" /> Export All Data
                  </button>
                  <label className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[13px] hover:bg-accent transition-colors cursor-pointer w-full">
                    <UploadIcon className="h-4 w-4" /> Import Data
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Memory Confirm */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/40" onClick={() => setShowClearConfirm(false)}>
          <div className="rounded-xl border border-border bg-background p-5 shadow-xl max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              <h4 className="font-semibold text-sm">Clear All Memories?</h4>
            </div>
            <p className="text-[12px] text-muted-foreground mb-4">This will permanently delete all stored memories. This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="rounded-lg border border-border px-3 py-1.5 text-[12px] hover:bg-accent transition-colors">Cancel</button>
              <button onClick={() => { onClearMemories(); setShowClearConfirm(false); }} className="rounded-lg bg-destructive px-3 py-1.5 text-[12px] text-destructive-foreground hover:bg-destructive/90 transition-colors">Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
