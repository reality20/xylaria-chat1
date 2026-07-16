import type { Connector } from '@/types';

export const EXAMPLE_CONNECTORS: Connector[] = [
  { id: 'example-1', name: 'Example Connector', type: 'api', description: 'An example API connector' },
];

export function addConnector(connector: Omit<Connector, 'id'>): Connector {
  const c: Connector = { ...connector, id: crypto.randomUUID() };
  return c;
}

export function removeConnector(_id: string): void {
  // no-op for demo
}