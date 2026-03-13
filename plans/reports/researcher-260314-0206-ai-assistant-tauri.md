# AI Assistant Feature — Research Report

**Date:** 2026-03-14
**Context:** Adding AI assistant (interview coaching) to Personal Translator (Tauri 2 + React 19 + Rust)

---

## 1. Anthropic Messages API

### Model Selection

| Model | API ID | Input | Output | Latency |
|-------|--------|-------|--------|---------|
| Haiku 4.5 | `claude-haiku-4-5-20251001` | $1/MTok | $5/MTok | Fastest |
| Sonnet 4.6 | `claude-sonnet-4-6` | $3/MTok | $15/MTok | Fast |
| Opus 4.6 | `claude-opus-4-6` | $5/MTok | $25/MTok | Moderate |

**Recommendation:** `claude-haiku-4-5` for interview coaching feedback (latency-sensitive, shorter responses). Fallback to `claude-sonnet-4-6` if quality insufficient. Haiku is 3–5x cheaper.

### Streaming via TypeScript SDK

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: "sk-..." });

const stream = client.messages.stream({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 1024,
  system: "You are an expert interview coach...",
  messages: [{ role: "user", content: userMessage }],
});

stream.on("text", (chunk) => {
  // Called for each text delta — pipe to UI
});

const final = await stream.finalMessage();
```

### SSE Event Types (raw, if bypassing SDK)

```
event: message_start       → message metadata
event: content_block_start → new content block
event: content_block_delta → text chunk (type: "text_delta", delta.text)
event: content_block_stop
event: message_delta       → usage stats
event: message_stop
```

### System Prompt Pattern (Interview Coaching)

```typescript
const SYSTEM_PROMPT = `You are an expert interview coach for software engineers.
The user will share transcript excerpts from an interview they are practicing.
Provide concise, actionable feedback on:
- Clarity of explanation
- Technical accuracy
- Communication style
- Suggested improvements

Keep responses under 200 words. Be direct and constructive.`;
```

### Tool Use (function calling)

Only needed if AI must take structured actions (e.g., score the response, classify question type). Format:

```typescript
const response = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  tools: [{
    name: "score_answer",
    description: "Score the interview answer on multiple dimensions",
    input_schema: {
      type: "object",
      properties: {
        clarity: { type: "number", description: "1-10" },
        accuracy: { type: "number" },
        feedback: { type: "string" },
      },
      required: ["clarity", "accuracy", "feedback"],
    },
  }],
  messages: [{ role: "user", content: transcript }],
});
// response.stop_reason === "tool_use" → parse response.content[0].input
```

For a simple "send context → get AI response" flow, **tool_use is optional**. Plain text response is sufficient.

---

## 2. MCP (Model Context Protocol)

### What MCP is

MCP is a standardized protocol for AI apps to connect to external tools/data sources (databases, APIs, filesystems). Think of it as a plugin system — Claude can call MCP servers as tools during a conversation.

**Architecture:** Host (your app) → MCP Client → MCP Server (local process or remote)

### Is MCP needed here?

**No.** MCP is for cases where Claude needs to actively query external systems during inference (e.g., search the web, query a DB). For the interview coaching use case:

- Context (transcript) is sent by the app, not fetched by Claude
- Response is plain text coaching feedback
- No dynamic tool calls needed mid-response

**Use regular `tool_use` API** if you want structured output (scores, categories). Use plain messages API if free-text feedback is sufficient.

**MCP adds complexity** (separate server process, JSON-RPC 2.0 protocol, lifecycle management) with no benefit for this use case.

### When to revisit MCP

If the feature grows to: Claude needs to search past sessions, query a knowledge base, or call external APIs autonomously — then MCP becomes relevant.

---

## 3. Tauri Architecture for AI Chat

### Where to put API calls: Rust backend (recommended)

**Rust backend advantages:**
- API key never exposed to renderer process (not in JS bundle, not in DevTools)
- Tauri's security model: renderer is sandboxed
- Consistent with existing pattern (`soniox_api_key` stored in Rust settings)
- Can use `reqwest` crate for HTTP with streaming

**Frontend-only disadvantages:**
- API key in JS = extractable by user, visible in network tab
- Not consistent with app's security model

### Streaming: Rust → Frontend via Tauri Channel

Tauri 2 `Channel` is the right primitive (ordered, fast, designed for streaming):

```rust
use tauri::{AppHandle, ipc::Channel};
use serde::Serialize;

#[derive(Serialize, Clone)]
#[serde(tag = "type", rename_all = "camelCase")]
enum AiEvent {
    Delta { text: String },
    Done,
    Error { message: String },
}

#[tauri::command]
pub async fn ai_chat(
    prompt: String,
    context: String,
    on_event: Channel<AiEvent>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let mut res = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", get_api_key())
        .header("anthropic-version", "2023-06-01")
        .json(&build_request(&prompt, &context))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    // Parse SSE stream
    while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
        if let Some(text) = parse_sse_delta(&chunk) {
            on_event.send(AiEvent::Delta { text }).ok();
        }
    }
    on_event.send(AiEvent::Done).ok();
    Ok(())
}
```

```typescript
// Frontend hook
import { Channel, invoke } from "@tauri-apps/api/core";

async function startAiChat(prompt: string, context: string, onChunk: (text: string) => void) {
  const channel = new Channel<{ type: string; text?: string }>();
  channel.onmessage = (msg) => {
    if (msg.type === "delta" && msg.text) onChunk(msg.text);
  };
  await invoke("ai_chat", { prompt, context, onEvent: channel });
}
```

### Alternative: HTTP request from frontend (simpler, less secure)

If API key security is acceptable (personal app, user enters own key), calling Anthropic directly from the frontend is simpler — no Rust SSE parsing code needed. Use the `@anthropic-ai/sdk` TypeScript package directly.

```typescript
const client = new Anthropic({ apiKey: settings.anthropicApiKey, dangerouslyAllowBrowser: true });
```

Note: `dangerouslyAllowBrowser: true` is required — SDK warns against browser use. Fine for a personal desktop app where the user owns the key.

### Recommended approach for this app

Given that this is a personal desktop app where the user enters their own Anthropic API key (same pattern as `soniox_api_key`):

1. **Store Anthropic API key in Rust settings** — same as Soniox key
2. **Make API call from Rust** using `reqwest` — keeps key in Rust layer
3. **Stream chunks to frontend** via Tauri `Channel`
4. **Create a `useAiChat` hook** — mirrors the existing `useSoniox` pattern

This is consistent with the existing architecture and security model.

---

## Implementation Checklist (not exhaustive)

- [ ] Add `anthropic_api_key: String` to `Settings` struct in Rust
- [ ] Add `ai_chat` Tauri command (Rust) using `reqwest` + SSE parsing
- [ ] Add `eventsource-client` or manual SSE parsing in Rust (`reqwest` + `bytes`)
- [ ] Create `useAiChat` hook in React
- [ ] Add AI panel UI component to `OverlayView` or as a new view

---

## Unresolved Questions

1. **Haiku 4.5 quality:** Does Haiku provide sufficient coaching quality, or does Sonnet quality justify 3x cost? — needs testing.
2. **SSE parsing in Rust:** `reqwest` returns raw bytes — need either `eventsource-client` crate or manual line parsing. No official Rust Anthropic SDK exists; confirm best crate approach.
3. **Context window strategy:** How much transcript to send per AI request? Interview coaching may need last N segments only — need a windowing strategy to control token cost.
4. **Trigger mechanism:** Is AI feedback triggered manually (button), automatically after each final segment, or on demand? UX decision not yet defined.

---

## Sources

- [Anthropic Streaming Messages Docs](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Anthropic Models Overview](https://platform.claude.com/docs/en/docs/about-claude/models/overview)
- [anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript)
- [Tauri v2 — Calling the Frontend from Rust](https://v2.tauri.app/develop/calling-frontend/)
- [Model Context Protocol Intro](https://www.anthropic.com/news/model-context-protocol)
