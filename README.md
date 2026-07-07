# Xylaria

Xylaria is a fully client-side, agentic AI chatbot with tool calling, code execution, LaTeX support, and a connector system for user-defined tools. No login, no API keys required.

## Features

- **Fully Client-Side** - Runs entirely in the browser, no server needed
- **No Login Required** - Start chatting immediately
- **No API Keys** - Direct browser calls to OpenAI-compatible endpoint
- **Single Model** - `xylaria-2-senoa-max` with tool-calling support via prompt injection
- **12 Built-in Tools**: calculator, weather, web search, URL fetch, datetime, unit conversion, text analysis, random generation, image prompt generation, JS execution, memory store/retrieve
- **Tool Calling via Prompt Injection** - XML-style `<tool_call>` tags since the API doesn't natively support function calling
- **MCP Support** - Connect to Model Context Protocol servers for external tools
- **Connectors** - User-defined HTTP tools (GET/POST/PUT/DELETE to any API)
- **JavaScript Sandbox** - Client-side code execution with safe globals
- **Artifact System** - Code editor with HTML preview, SVG viewer
- **LaTeX Support** - Full KaTeX rendering for math expressions ($...$ and $$...$$)
- **Syntax Highlighting** - Code blocks with language-specific colors
- **Markdown** - Full support including tables, lists, links, bold, italic, strikethrough
- **Persistent Chat History** - localStorage-based with sidebar
- **Streaming Responses** - Real-time output with tool call indicators
- **Dark/Light Mode** - Automatic system theme detection

## Architecture

### Tool Calling (Prompt Injection)

Since the API doesn't support native function calling, the system:

1. Injects tool descriptions into the system prompt using XML tags
2. The model outputs `<tool_call>{"name": "tool", "arguments": {...}}</tool_call>`
3. The parser extracts tool calls, executes them, and feeds results back
4. The model continues with the tool results incorporated

### Project Structure

```
src/
  components/
    chat-interface.tsx      # Main layout
    chat-input.tsx           # Message input
    message-list.tsx         # Message rendering
    sidebar.tsx              # Chat history sidebar
    markdown/
      markdown-renderer.tsx  # Markdown + LaTeX + code highlighting
      latex-render.tsx       # KaTeX component
    artifacts/
      artifact-viewer.tsx    # Code editor, HTML preview
    code-executor/
      js-executor.tsx        # JavaScript sandbox
    connectors-panel.tsx     # Tools & connectors UI
    tool-call-display.tsx    # Active tool indicators
  hooks/
    use-agent-chat.ts        # Core chat logic with agentic loop
    use-local-storage.ts     # Persist state
  lib/
    tools/
      registry.ts            # Tool prompt builder & executor
      builtins.ts            # 12 built-in tools
    connectors/
      registry.ts            # User-defined HTTP tools
    mcp/
      client.ts              # MCP client (HTTP/SSE)
    utils.ts                 # Utilities
  types/
    index.ts                 # TypeScript types
  App.tsx
  main.tsx
```

## API

- **Endpoint**: `https://xylaria2s.vercel.app/api/v1/chat/completions`
- **Model**: `xylaria-2-senoa-max`
- **All messages concatenated** into single user message with role labels

## Deploy

The `dist/` folder contains pre-built files. Deploy to any static host (Vercel, Netlify, GitHub Pages, etc.).

## Development

```bash
npm install
npm run dev      # Development
npm run build    # Production
```

## License

MIT
