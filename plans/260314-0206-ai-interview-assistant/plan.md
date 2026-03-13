# Plan: AI Interview Assistant

## Overview
Biến translator thành công cụ hỗ trợ phỏng vấn. Thêm nút "Ask AI" ở mỗi câu dịch → gửi câu đó + 5 câu context gần nhất vào AI panel (split view). Toggle on/off AI mode trong settings.

## Architecture Decision

**Node.js MCP Backend + Anthropic API**
- Thêm `ai-service/` Node.js service cùng repo
- Service expose MCP server (Model Context Protocol) cho Claude kết nối tools
- Tauri app giao tiếp với Node.js service qua HTTP/WebSocket (localhost)
- API key giữ ở backend, không leak ra frontend
- Hỗ trợ MCP tools: Claude có thể gọi tools (search context, get transcript history, etc.)
- Model: `claude-haiku-4-5-20251001` (rẻ, nhanh), fallback `claude-sonnet-4-6`

### Architecture Flow
```
┌──────────────┐     HTTP/WS      ┌─────────────────────┐     Anthropic API
│  Tauri App   │ ◄──────────────► │  ai-service (Node)  │ ◄──────────────►  Claude
│  (Frontend)  │   localhost:3456 │                     │
│              │                  │  MCP Server          │     MCP Tools:
│  Ask AI btn  │ → POST /chat    │  ├─ get_transcript   │     - get_transcript
│  AI Panel    │ ← SSE stream    │  ├─ search_history   │     - search_history
│              │                  │  └─ get_context      │     - get_context
└──────────────┘                  └─────────────────────┘
```

- Tauri sidecar spawns Node.js service on app start
- Service auto-stops on app close
- Frontend calls `POST /chat` with question + context → receives SSE stream

## Layout

```
┌─────────────────────────────────────────────┐
│ Titlebar  [▶ Start] [src] [⚙] [📋] [AI ✨] [×] │
├──────────────────────┬──────────────────────┤
│   Transcript Panel   │   AI Assistant Panel │
│                      │                      │
│  "Hello, how are.."  │  💬 AI Response      │
│  [Ask AI]            │  streaming here...   │
│                      │                      │
│  "I'm fine thanks"   │                      │
│  [Ask AI]            │                      │
│                      │                      │
├──────────────────────┴──────────────────────┤
│ [●] Listening... provisional text       ▎   │
└─────────────────────────────────────────────┘
```

- AI mode OFF: full-width transcript (giống hiện tại)
- AI mode ON: split 60/40 (transcript / AI panel)
- AI panel có input box ở dưới để user hỏi thêm

## Phases

| # | Phase | Status | Priority |
|---|-------|--------|----------|
| 1 | Node.js AI Service + MCP | Pending | High |
| 2 | Tauri Sidecar Integration | Pending | High |
| 3 | Settings + Toggle | Pending | High |
| 4 | Transcript "Ask AI" button | Pending | High |
| 5 | AI Assistant Panel | Pending | High |
| 6 | Split Layout Integration | Pending | Medium |

## Phase Details

### Phase 1: Node.js AI Service + MCP
**Files:** `ai-service/` (NEW directory)

```
ai-service/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          — Express server + SSE endpoint
│   ├── anthropic.ts      — Anthropic SDK wrapper, streaming
│   ├── mcp-server.ts     — MCP tool definitions
│   └── tools/
│       ├── get-transcript.ts    — Tool: retrieve recent transcript
│       ├── search-history.ts    — Tool: search session history
│       └── get-context.ts       — Tool: get surrounding context
```

- Express server on `localhost:3456`
- `POST /chat` — nhận `{ question, context, systemPrompt }`, trả SSE stream
- `POST /config` — nhận API key + model config từ Tauri app
- `GET /health` — health check
- MCP server với tools cho Claude tự query thêm data khi cần
- Anthropic SDK `@anthropic-ai/sdk` gọi Messages API với tool_use

### Phase 2: Tauri Sidecar Integration
**Files:** `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`

- Tauri sidecar config để spawn `node ai-service/dist/index.js` on app start
- Rust command `start_ai_service` / `stop_ai_service`
- Health check polling khi startup
- Auto-kill on app close
- Frontend gọi service qua `fetch("http://localhost:3456/chat")`

### Phase 3: Settings + Toggle
**Files:** `src/types/settings.ts`, `src/components/settings-view.tsx`, `src/components/titlebar.tsx`

- Thêm `anthropic_api_key: string`, `ai_assistant_enabled: boolean`, `ai_model: string` vào Settings
- Thêm card "AI Assistant" trong settings: API key input + model selector + toggle
- Thêm AI toggle button trên titlebar (sparkle icon)
- Toggle gửi config tới Node.js service via `POST /config`
- Rust backend cũng lưu key vào settings.json

### Phase 4: "Ask AI" Button
**Files:** `src/components/transcript-display.tsx`, `src/styles/components.css`

- Mỗi translated segment có nút "Ask AI" (hover reveal)
- Click → lấy segment đó + 5 segments gần nhất
- Gửi vào AI panel qua callback prop
- Button chỉ hiện khi `ai_assistant_enabled = true`

### Phase 5: AI Assistant Panel
**Files:** `src/components/ai-assistant-panel.tsx` (NEW), `src/styles/components.css`

- Chat-like UI: messages list + input box
- SSE streaming display (word-by-word animation)
- Context preview (collapsed, expandable)
- Clear chat + stop generation buttons
- Auto-scroll (reuse pattern từ transcript)
- Tool use indicator (khi Claude đang gọi MCP tool)

### Phase 6: Split Layout
**Files:** `src/components/overlay-view.tsx`, `src/styles/components.css`

- AI mode ON: flex split 60/40 with draggable divider
- AI mode OFF: transcript full width
- Smooth transition khi toggle
- Responsive: collapse AI panel khi window quá nhỏ

## Dependencies

### ai-service/
- `@anthropic-ai/sdk` — Anthropic TypeScript SDK
- `express` — HTTP server
- `@modelcontextprotocol/sdk` — MCP server SDK
- `cors` — CORS for localhost

### Tauri
- Sidecar config trong `tauri.conf.json`

## Risk Assessment
- **Sidecar complexity**: Node.js process management cần handle crash/restart
- **Port conflict**: `localhost:3456` có thể bị chiếm → fallback port
- **MCP tool latency**: tool calls thêm round-trip → keep tools simple
- **Haiku quality**: có thể không đủ sâu → model selector cho user chọn

## Success Criteria
- Node.js service start/stop cùng app
- Toggle AI mode on/off mượt
- Click "Ask AI" → streaming response trong AI panel
- Claude có thể gọi MCP tools để lấy thêm context
- Context 5 câu gần nhất được gửi đúng
- UI không giật khi streaming
