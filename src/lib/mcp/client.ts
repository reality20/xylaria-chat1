import type { Tool, MCPServer } from '@/types';

const KEY = 'xylaria-mcp-servers';

export function loadMCPServers(): MCPServer[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveMCPServers(s: MCPServer[]) { localStorage.setItem(KEY, JSON.stringify(s)); }
export function addMCPServer(s: Omit<MCPServer, 'id' | 'tools' | 'status'>): MCPServer {
  const n: MCPServer = { ...s, id: crypto.randomUUID(), tools: [], status: 'disconnected' };
  const all = loadMCPServers(); all.push(n); saveMCPServers(all); return n;
}
export function removeMCPServer(id: string) { saveMCPServers(loadMCPServers().filter((s) => s.id !== id)); }

export async function connectMCPServer(server: MCPServer): Promise<Tool[]> {
  try {
    const toolsUrl = server.command.startsWith('http') ? `${server.command.replace(/\/$/, '')}/tools` : null;
    if (!toolsUrl) return [];
    const res = await fetch(toolsUrl, { headers: server.env });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.tools || []).map((t: Record<string, unknown>) => ({
      name: `mcp_${t.name}`,
      description: `${t.description} (MCP: ${server.name})`,
      parameters: t.parameters || { type: 'object', properties: {} },
      execute: async (args: Record<string, unknown>) => {
        const r = await fetch(`${server.command.replace(/\/$/, '')}/invoke`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...server.env },
          body: JSON.stringify({ tool: t.name, arguments: args }),
        });
        return r.json();
      },
    }));
  } catch { return []; }
}
