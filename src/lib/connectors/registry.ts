import type { Connector, Tool } from '@/types';

const KEY = 'xylaria-connectors';

export function loadConnectors(): Connector[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveConnectors(c: Connector[]) { localStorage.setItem(KEY, JSON.stringify(c)); }
export function addConnector(c: Omit<Connector, 'id'>): Connector {
  const n = { ...c, id: crypto.randomUUID() };
  const all = loadConnectors(); all.push(n); saveConnectors(all); return n;
}
export function removeConnector(id: string) { saveConnectors(loadConnectors().filter((c) => c.id !== id)); }

export function connectorsToTools(connectors: Connector[]): Tool[] {
  return connectors.map((conn) => ({
    name: `connector_${conn.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    description: `${conn.description} (${conn.name} connector: ${conn.method} ${conn.url})`,
    parameters: conn.parameters,
    execute: async (args: Record<string, unknown>) => {
      try {
        let url = conn.url;
        const query = new URLSearchParams();
        for (const [k, v] of Object.entries(args)) {
          if (typeof v === 'string' && url.includes(`{${k}}`)) url = url.replace(`{${k}}`, encodeURIComponent(v));
          else if (typeof v === 'string' || typeof v === 'number') query.append(k, String(v));
        }
        const qs = query.toString();
        if (qs) url += (url.includes('?') ? '&' : '?') + qs;

        let body: string | undefined;
        const headers: Record<string, string> = { ...(conn.headers || {}) };
        if (conn.bodyTemplate) {
          body = conn.bodyTemplate;
          for (const [k, v] of Object.entries(args)) body = body.replace(new RegExp(`{${k}}`, 'g'), String(v));
          if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
          try { body = JSON.stringify({ ...JSON.parse(body), ...args }); } catch { /* keep as template */ }
        } else if (['POST', 'PUT', 'PATCH'].includes(conn.method)) {
          body = JSON.stringify(args);
          headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(url, { method: conn.method, headers, ...(body ? { body } : {}) });
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : await res.text();
        return { status: res.status, data };
      } catch (err) { return { error: err instanceof Error ? err.message : String(err) }; }
    },
  }));
}

export const EXAMPLE_CONNECTORS: Omit<Connector, 'id'>[] = [
  { name: 'cat_facts', description: 'Random cat facts', method: 'GET', url: 'https://catfact.ninja/fact', parameters: { type: 'object', properties: {} } },
  { name: 'ip_info', description: 'IP geolocation', method: 'GET', url: 'https://ipapi.co/{ip}/json/', parameters: { type: 'object', properties: { ip: { type: 'string', description: 'IP address' } }, required: ['ip'] } },
];
