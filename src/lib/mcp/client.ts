import type { MCPServer } from '@/types';

export function addMCPServer(server: Omit<MCPServer, 'id' | 'status'>): MCPServer {
  return { ...server, id: crypto.randomUUID(), status: 'disconnected' };
}

export function removeMCPServer(_id: string): void {
  // no-op for demo
}