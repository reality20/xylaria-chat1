import type { Tool, ToolCall } from '@/types';

// Build a clean tool description for the system prompt
export function buildToolsDescription(tools: Tool[]): string {
  return tools.map((t) => {
    const params = Object.entries(t.parameters.properties)
      .map(([key, val]) => {
        const req = t.parameters.required?.includes(key);
        return `  - ${key}: ${val.type}${req ? ' (required)' : ''} - ${val.description}`;
      }).join('\n');
    return `- ${t.name}: ${t.description}\n${params}`;
  }).join('\n\n');
}

// Strict JSON parsing for tool calls — non-greedy but balances braces.
// We accept both { "tool": ..., "params": {...} } and { "tool": ..., "arguments": {...} }.
const TOOL_JSON_REGEX = /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"(?:params|arguments)"\s*:\s*(\{[\s\S]*?\})\s*\}/g;
const ARTIFACT_JSON_REGEX = /\{\s*"artifact"\s*:\s*(\{[\s\S]*?\})\s*\}/g;

export interface ParsedResponse {
  cleanText: string;
  toolCalls: ToolCall[];
  artifacts: Array<{
    type: 'code' | 'html' | 'svg' | 'document' | 'image';
    title: string;
    content: string;
    language?: string;
    imageUrl?: string;
  }>;
}

export function parseAgentResponse(content: string): ParsedResponse {
  const toolCalls: ToolCall[] = [];
  const artifacts: ParsedResponse['artifacts'] = [];
  let cleanText = content;

  // Parse tool calls
  let match: RegExpExecArray | null;
  while ((match = TOOL_JSON_REGEX.exec(content)) !== null) {
    const matchArr = match as RegExpExecArray;
    try {
      const params = JSON.parse(matchArr[2]);
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: matchArr[1],
        arguments: params,
      });
      cleanText = cleanText.replace(matchArr[0], '');
    } catch {
      // Invalid JSON, skip
    }
  }

  // Parse artifacts
  while ((match = ARTIFACT_JSON_REGEX.exec(content)) !== null) {
    const matchArr = match as RegExpExecArray;
    try {
      const art = JSON.parse(matchArr[1]);
      if (art.content || art.image_url) {
        artifacts.push({
          type: art.type || 'code',
          title: art.title || 'Artifact',
          content: art.content || '',
          language: art.language,
          imageUrl: art.image_url,
        });
        cleanText = cleanText.replace(matchArr[0], `\n_[${art.title || 'Artifact'}]_\n`);
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  // Clean up
  cleanText = cleanText
    .replace(/```json\s*\{\s*"tool"[\s\S]*?\}\s*```/g, '')
    .replace(/```json\s*\{\s*"artifact"[\s\S]*?\}\s*```/g, '')
    .replace(/```\s*\{\s*"tool"[\s\S]*?\}\s*```/g, '')
    .replace(/```\s*\{\s*"artifact"[\s\S]*?\}\s*```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleanText, toolCalls, artifacts };
}

// Strip tool/artifact JSON from streaming content for display
export function stripJsonForDisplay(content: string): string {
  return content
    .replace(TOOL_JSON_REGEX, '')
    .replace(ARTIFACT_JSON_REGEX, '')
    .replace(/```json\s*\{\s*"tool"[\s\S]*?\}\s*```/g, '')
    .replace(/```json\s*\{\s*"artifact"[\s\S]*?\}\s*```/g, '')
    .replace(/```\s*\{\s*"tool"[\s\S]*?\}\s*```/g, '')
    .replace(/```\s*\{\s*"artifact"[\s\S]*?\}\s*```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function executeToolCall(
  toolCall: ToolCall,
  tools: Tool[]
): Promise<{ result: unknown; error: string | null; duration: number; artifact?: { type: 'code' | 'html' | 'svg' | 'document' | 'image'; title: string; content: string; language?: string; imageUrl?: string } }> {
  const tool = tools.find((t) => t.name === toolCall.name);
  if (!tool) {
    return { result: null, error: `Tool "${toolCall.name}" not found`, duration: 0 };
  }

  const start = performance.now();
  try {
    const result = await tool.execute(toolCall.arguments);
    const duration = Math.round(performance.now() - start);
    // If the tool result contains an artifact wrapper (e.g. svg_generator), extract it.
    const r = result as { artifact?: { type: 'code' | 'html' | 'svg' | 'document' | 'image'; title: string; content: string; language?: string; imageUrl?: string } };
    if (r && typeof r === 'object' && r.artifact) {
      return { result, error: null, duration, artifact: r.artifact };
    }
    // If iris_image_gen returns image_urls, wrap the first as an image artifact.
    const iris = result as { image_urls?: string[]; model?: string };
    if (iris && Array.isArray(iris.image_urls) && iris.image_urls.length > 0) {
      return {
        result, error: null, duration,
        artifact: {
          type: 'image',
          title: iris.model ? `${iris.model} image` : 'Generated image',
          content: '',
          imageUrl: iris.image_urls[0],
        },
      };
    }
    return { result, error: null, duration };
  } catch (err) {
    return {
      result: null,
      error: err instanceof Error ? err.message : String(err),
      duration: Math.round(performance.now() - start),
    };
  }
}

export function formatToolResult(name: string, result: unknown, error: string | null): string {
  if (error) return `[Tool Error: ${name}] ${error}`;
  return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
}
