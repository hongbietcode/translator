import Anthropic from "@anthropic-ai/sdk";
import type { Response } from "express";
import type { ChatRequest, TranscriptContext } from "./types.js";
import { getRecentTranscript } from "./tools/get-transcript.js";
import { searchHistory } from "./tools/search-history.js";
import { getContext } from "./tools/get-context.js";

let client: Anthropic | null = null;
let currentModel = "claude-haiku-4-5-20251001";

export function configure(apiKey: string, model?: string) {
  client = new Anthropic({ apiKey });
  if (model) currentModel = model;
}

const tools: Anthropic.Tool[] = [
  {
    name: "get_transcript",
    description: "Get the most recent transcript segments from the conversation",
    input_schema: {
      type: "object" as const,
      properties: {
        count: {
          type: "number",
          description: "Number of recent segments to retrieve (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "search_history",
    description: "Search transcript history for segments matching a query",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query to find in transcript text or translations",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_context",
    description: "Get surrounding context around a specific transcript segment",
    input_schema: {
      type: "object" as const,
      properties: {
        segment_index: {
          type: "number",
          description: "Index of the target segment",
        },
        window_size: {
          type: "number",
          description: "Number of segments before the target to include (default 5)",
        },
      },
      required: ["segment_index"],
    },
  },
];

function executeTool(name: string, input: Record<string, unknown>): string {
  switch (name) {
    case "get_transcript": {
      const count = (input.count as number) || 10;
      return JSON.stringify(getRecentTranscript(count));
    }
    case "search_history": {
      return JSON.stringify(searchHistory(input.query as string));
    }
    case "get_context": {
      const idx = input.segment_index as number;
      const win = (input.window_size as number) || 5;
      return JSON.stringify(getContext(idx, win));
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function buildSystemPrompt(customPrompt?: string): string {
  const base = `You are an AI interview assistant. You help users understand and respond to conversations happening in real-time. You have access to the transcript of the ongoing conversation.

When asked about something said in the conversation, use the available tools to look up the transcript context. Provide concise, helpful analysis and suggested responses.

Keep responses brief and actionable - the user is in an active conversation.`;

  return customPrompt ? `${base}\n\n${customPrompt}` : base;
}

function formatContext(context: TranscriptContext[]): string {
  if (!context.length) return "";
  return (
    "\n\nRecent conversation context:\n" +
    context
      .map(
        (s) =>
          `[Speaker ${s.speaker ?? "?"}] ${s.text}${s.translation ? ` → ${s.translation}` : ""}`,
      )
      .join("\n")
  );
}

export async function streamChat(req: ChatRequest, res: Response) {
  if (!client) {
    res.write(`data: ${JSON.stringify({ type: "error", error: "API key not configured" })}\n\n`);
    res.end();
    return;
  }

  const contextStr = formatContext(req.context);
  const userMessage = req.question + contextStr;

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  try {
    let continueLoop = true;

    while (continueLoop) {
      const stream = client.messages.stream({
        model: currentModel,
        max_tokens: 2048,
        system: buildSystemPrompt(req.systemPrompt),
        tools,
        messages,
      });

      let currentToolUse: { id: string; name: string; inputJson: string } | null = null;
      const assistantContent: Anthropic.ContentBlock[] = [];

      for await (const event of stream) {
        switch (event.type) {
          case "content_block_start": {
            if (event.content_block.type === "tool_use") {
              currentToolUse = {
                id: event.content_block.id,
                name: event.content_block.name,
                inputJson: "",
              };
              res.write(
                `data: ${JSON.stringify({ type: "tool_use", tool: event.content_block.name })}\n\n`,
              );
            }
            break;
          }
          case "content_block_delta": {
            if (event.delta.type === "text_delta") {
              res.write(
                `data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`,
              );
            } else if (event.delta.type === "input_json_delta" && currentToolUse) {
              currentToolUse.inputJson += event.delta.partial_json;
            }
            break;
          }
          case "content_block_stop": {
            if (currentToolUse) {
              currentToolUse = null;
            }
            break;
          }
        }
      }

      const finalMessage = await stream.finalMessage();
      assistantContent.push(...finalMessage.content);

      if (finalMessage.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: finalMessage.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = finalMessage.content
          .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
          .map((b) => ({
            type: "tool_result" as const,
            tool_use_id: b.id,
            content: executeTool(b.name, b.input as Record<string, unknown>),
          }));

        messages.push({ role: "user", content: toolResults });
      } else {
        continueLoop = false;
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`);
  }

  res.end();
}
