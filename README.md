# Xylaria

Xylaria is a fully client-side, agentic AI chatbot with tool calling, image generation, web search, code execution, LaTeX support, and an artifact system. No login, no API keys required. Inspired by the best UX patterns from ChatGPT, Claude, and Gemini.

## Features

### Core chat
- **Fully Client-Side** — Runs entirely in the browser; no server, no tracking
- **No Login Required** — Start chatting immediately
- **No API Keys** — Direct browser calls to OpenAI-compatible endpoint
- **Streaming Responses** — Real-time token-by-token output
- **5 Chat Modes** — Fast, Balanced, Creative, Precise, Research (each tunes temperature + system prompt)
- **Persistent Chat History** — localStorage-based with full sidebar
- **Markdown + LaTeX** — Full KaTeX math rendering, syntax-highlighted code, tables, images
- **Dark/Light/System Themes** — Automatic + manual toggle

### Tools (12 built-in + custom + MCP)
- **iris_image_gen** — Iris v1.5 image generator (FLUX.2-Klein-Multi-LoRA on HF Space). Text-to-image with width/height/steps/guidance/seed/batch parameters.
- **svg_generator** — Emits SVG artifacts that open in the artifact viewer (ChatGPT-style)
- **web_search** — Wikipedia Action API + DuckDuckGo Instant Answers + Bing via CORS proxy
- **image_search** — Openverse API + Wikimedia Commons + Picsum fallback
- **fetch_url** — Readable-text extraction from any URL via CORS proxy
- **calculator** — Safe math expression evaluation
- **weather** — Open-Meteo (free, no key)
- **datetime** — Current date/time in any timezone
- **convert** — Length, mass, temperature, time, data units
- **analyze_text** — Stats, keywords, readability (Flesch)
- **memory_store / memory_retrieve** — Persistent cross-chat memory
- **MCP Server support** — Connect to any Model Context Protocol server
- **Custom HTTP Connectors** — GET/POST/PUT/DELETE to any API

### Artifact panel (Claude-style + ChatGPT-style)
- **Code artifacts** — JavaScript execution sandbox with live output, plus syntax-highlighted viewer for any language
- **HTML artifacts** — Live iframe preview with sandboxed scripts
- **SVG artifacts** — Rendered vector graphics with code/preview toggle
- **Document artifacts** — Rendered Markdown
- **Image artifacts** — Inline display with download
- **Download** — Save any artifact as a file with the correct extension

### Chat management (ChatGPT-style)
- **Search** — Filter chats by title or message content
- **Pin** — Pin important chats to the top
- **Fork** — Branch a conversation from any message
- **Rename** — Inline rename from the sidebar
- **Export** — Download any chat as Markdown
- **Date grouping** — Today, Yesterday, Previous 7/30 days, Older
- **Delete all** — Bulk clear with confirmation

### Input bar (Gemini + ChatGPT-style)
- **Quick action chips** — Image / Search / Code / Fetch / Explain prefixes
- **Mode picker** — Switch between Fast/Balanced/Creative/Precise/Research inline
- **File attachments** — Attach files (names are passed to the model)
- **Voice input** — Web Speech API transcription (Chrome/Edge)
- **Auto-grow textarea** — Up to 200px
- **Keyboard shortcuts** — Enter to send, Shift+Enter for newline, Tab to indent

### Command palette (⌘K)
- Search across actions, chats, and prompt templates
- Quick-start any of 6 prompt templates (Image, Search, Code, Explain, Research, Creative)
- Fuzzy-filtered, keyboard-navigable

### Share & export
- Copy entire chat as Markdown
- Download as `.md` file
- Generate a shareable URL (chat encoded in URL hash — no server needed)

### Keyboard shortcuts
| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette |
| `⌘/` or `⌘B` | Toggle sidebar |
| `⌘,` | Open settings |
| `⌘J` | New chat |
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Esc` | Close artifact panel |

### Settings
- Theme, font size, display name
- Custom instructions (appended to every system prompt)
- Editable system prompt with `{date}`, `{time}`, `{tools}` substitutions
- Feature toggles for artifacts, Iris, web search, and memory
- Default chat mode picker
- Connectors and MCP server management
- Memory browser and clear
- Full data export/import (JSON backup)

## Architecture

### Tool Calling (Prompt Injection)

Since the API doesn't support native function calling, the system:

1. Injects tool descriptions into the system prompt
2. The model outputs `{"tool": "name", "params": {...}}` JSON blocks
3. The parser extracts tool calls, executes them, and feeds results back
4. The model continues with the tool results incorporated (up to 10 iterations)

### Iris v1.5 Image Generation

The `iris_image_gen` tool calls the FLUX.2-Klein-Multi-LoRA HF Space via its Gradio API:

1. Uploads a 1×1 white PNG as a base image placeholder (the model requires one)
2. POSTs to `/gradio_api/call/infer` with 27 positional arguments
3. Streams the SSE response from `/gradio_api/call/infer/{event_id}`
4. Extracts image URLs from the `complete` event
5. Returns both markdown-renderable images and an image artifact

The free HF Space may run out of ZeroGPU quota — retry after a minute if you get a quota error.

### Web Search

The `web_search` tool combines three sources:
1. **Wikipedia Action API** (CORS-enabled, returns JSON summaries)
2. **DuckDuckGo Instant Answer API** (CORS-enabled)
3. **Bing HTML via CORS proxy** (allorigins.win / corsproxy.io fallbacks)

### Project Structure

```
src/
  components/
    chat-interface.tsx      # Main layout, shortcuts, modals
    chat-input.tsx           # Mode picker, files, voice, quick actions
    message-list.tsx         # Messages, edit, fork, copy, image rendering
    sidebar.tsx              # Search, pin, fork, rename, prompts
    artifact-viewer.tsx      # Code/HTML/SVG/image/document panel
    settings-modal.tsx       # 8-tab settings (general/modes/tools/conn/mcp/mem/data/about)
    command-palette.tsx      # ⌘K palette with actions + chats + prompts
    share-modal.tsx          # Export markdown / generate share link
    tool-call-display.tsx    # Active tool call indicators
    markdown/
      markdown-renderer.tsx  # Markdown + LaTeX + tables + images + code
      latex-render.tsx       # KaTeX component
    ui/                       # shadcn/ui components
  hooks/
    use-agent-chat.ts        # Core chat logic, agentic loop, chat management
    use-local-storage.ts     # Persist state
    use-mobile.ts            # Mobile detection
  lib/
    tools/
      registry.ts            # Tool prompt builder, JSON parser, executor
      builtins.ts            # 12 built-in tools including Iris v1.5
    connectors/
      registry.ts            # User-defined HTTP tools
    mcp/
      client.ts              # MCP client (HTTP/SSE)
    settings.ts              # Settings + memory persistence
    utils.ts                 # Utilities
  types/
    index.ts                 # TypeScript types + ChatMode definitions
  App.tsx
  main.tsx
```

## API

- **Endpoint**: `https://xylaria2s.vercel.app/api/v1/chat/completions`
- **Model**: `xylaria-2-senoa-max`
- All messages concatenated into single user message with role labels
- Temperature varies by chat mode (0.2–1.0)

## Deploy

Build with `npm run build` and deploy the `dist/` folder to any static host (Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.).

## Development

```bash
npm install
npm run dev      # Development server on :3000
npm run build    # Production build → dist/
npm run preview  # Preview the production build
```

## License

MIT
