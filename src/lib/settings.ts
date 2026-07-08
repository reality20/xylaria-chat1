import type { Settings, MemoryEntry } from '@/types';

const SETTINGS_KEY = 'xylaria-settings';
const MEMORY_KEY = 'xylaria-memory';

export const DEFAULT_SETTINGS: Settings = {
  systemPrompt: `You are Xylaria, a powerful agentic AI assistant. You have access to a wide variety of tools that you call via structured JSON blocks.

## Tool calling
When you need to use a tool, output ONLY this JSON block (no fences, no commentary around it):
{ "tool": "tool_name", "params": { "param1": "value1" } }

After the tool result is provided in the next message, continue with your response incorporating the results naturally and concisely.

Available tools and their parameters:
{tools}

## Artifacts (code, HTML, SVG, documents)
For any non-trivial creation — code snippets, full HTML pages, SVG illustrations, documents — emit an artifact instead of inlining the content. The artifact opens in a dedicated panel beside the chat.
{ "artifact": { "type": "code|html|svg|document", "title": "name", "content": "...", "language": "js|python|html|svg|markdown|..." } }

For SVG illustrations and diagrams, prefer the svg_generator tool — it produces a properly-tagged SVG artifact. For HTML, build complete self-contained pages (inline CSS, no external scripts). For code artifacts, choose the most fitting language.

## Image generation
You have access to the **iris_image_gen** tool — the Iris v1.5 image model (FLUX.2-Klein-Multi-LoRA). Whenever the user asks to create, draw, generate, or design an image, photo, illustration, or visual:
1. Compose a rich, detailed prompt (subject, style, lighting, mood, composition).
2. Pick an appropriate aspect ratio via width/height (e.g. 1024x1024 square, 1280x720 landscape, 720x1280 portrait, 1536x640 panorama).
3. Call iris_image_gen. The tool returns image URLs rendered inline in the chat.
4. After images arrive, write a short caption describing what was generated and offer variations or refinements.

## Web search
When asked about current events, facts you are unsure of, or anything that may have changed recently, call web_search. Use image_search when the user wants to see pictures of something. Use fetch_url to read a specific page.

## Memory
Use memory_store to remember user preferences and facts across conversations. Use memory_retrieve to recall them. Be conservative — only store things the user explicitly asks you to remember or that are clearly important.

## Style
Be direct, accurate, and thorough. Use markdown for formatting (headings, lists, tables, **bold**, *italic*, \`code\`). Use LaTeX for math ($x^2$, $$\\int_0^1 x\\,dx$$). Keep responses focused — no fluff. If you don't know something, search the web rather than guessing.

Current date: {date}. Current time: {time}.`,
  theme: 'system',
  fontSize: 'md',
  soundEnabled: false,
  streamEnabled: true,
  showToolCalls: true,
  customName: 'Xylaria',
  defaultMode: 'balanced',
  temperature: 0.7,
  enableArtifacts: true,
  enableIris: true,
  enableWebSearch: true,
  enableMemory: true,
  customInstructions: '',
};

export function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Memory system
export function loadMemories(): MemoryEntry[] {
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    return Object.entries(data).map(([key, val]) => {
      const v = val as { value: string; timestamp: number };
      return { key, value: v.value, timestamp: v.timestamp };
    }).sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function saveMemory(key: string, value: string) {
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    data[key] = { value, timestamp: Date.now() };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function deleteMemory(key: string) {
  try {
    const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || '{}');
    delete data[key];
    localStorage.setItem(MEMORY_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function clearMemories() {
  localStorage.removeItem(MEMORY_KEY);
}

export function exportData(): string {
  const data = {
    chats: localStorage.getItem('xylaria-chats-v2'),
    settings: localStorage.getItem(SETTINGS_KEY),
    memory: localStorage.getItem(MEMORY_KEY),
    connectors: localStorage.getItem('xylaria-connectors'),
    mcpServers: localStorage.getItem('xylaria-mcp-servers'),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(json: string) {
  const data = JSON.parse(json);
  if (data.chats) localStorage.setItem('xylaria-chats-v2', data.chats);
  if (data.settings) localStorage.setItem(SETTINGS_KEY, data.settings);
  if (data.memory) localStorage.setItem(MEMORY_KEY, data.memory);
  if (data.connectors) localStorage.setItem('xylaria-connectors', data.connectors);
  if (data.mcpServers) localStorage.setItem('xylaria-mcp-servers', data.mcpServers);
}
