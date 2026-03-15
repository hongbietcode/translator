use serde::{Deserialize, Deserializer, Serialize};
use std::sync::Mutex;
use tauri::State;

fn deserialize_optional_u32<'de, D: Deserializer<'de>>(d: D) -> Result<Option<u32>, D::Error> {
    let v: Option<serde_json::Value> = Option::deserialize(d)?;
    match v {
        None | Some(serde_json::Value::Null) => Ok(None),
        Some(serde_json::Value::Number(n)) => Ok(n.as_u64().map(|x| x as u32)),
        Some(serde_json::Value::String(s)) => Ok(s.parse::<u32>().ok()),
        _ => Ok(None),
    }
}

fn deserialize_u64_flex<'de, D: Deserializer<'de>>(d: D) -> Result<u64, D::Error> {
    let v: serde_json::Value = serde_json::Value::deserialize(d)?;
    match v {
        serde_json::Value::Number(n) => Ok(n.as_u64().unwrap_or(0)),
        serde_json::Value::String(s) => Ok(s.parse::<u64>().unwrap_or(0)),
        _ => Ok(0),
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct TranscriptSegment {
    pub text: String,
    pub translation: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_u32")]
    pub speaker: Option<u32>,
    #[serde(deserialize_with = "deserialize_u64_flex")]
    pub timestamp: u64,
}

pub struct AiTranscriptStore(pub Mutex<Vec<TranscriptSegment>>);

#[derive(Clone, Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Serialize)]
struct AnthropicTool {
    name: String,
    description: String,
    input_schema: serde_json::Value,
}

#[derive(Serialize)]
struct ChatApiRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<AnthropicMessage>,
    tools: Vec<AnthropicTool>,
}

#[derive(Deserialize)]
struct ChatApiResponse {
    content: Vec<ContentBlock>,
    stop_reason: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
struct ContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    text: Option<String>,
    id: Option<String>,
    name: Option<String>,
    input: Option<serde_json::Value>,
}

fn build_tools() -> Vec<AnthropicTool> {
    vec![
        AnthropicTool {
            name: "get_transcript".into(),
            description: "Get the most recent transcript segments from the conversation".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "count": { "type": "number", "description": "Number of recent segments to retrieve (default 10)" }
                },
                "required": []
            }),
        },
        AnthropicTool {
            name: "search_history".into(),
            description: "Search transcript history for segments matching a query".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string", "description": "Search query to find in transcript text or translations" }
                },
                "required": ["query"]
            }),
        },
        AnthropicTool {
            name: "get_context".into(),
            description: "Get surrounding context around a specific transcript segment".into(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "segment_index": { "type": "number", "description": "Index of the target segment" },
                    "window_size": { "type": "number", "description": "Number of segments before the target to include (default 5)" }
                },
                "required": ["segment_index"]
            }),
        },
    ]
}

fn execute_tool(name: &str, input: &serde_json::Value, store: &[TranscriptSegment]) -> String {
    match name {
        "get_transcript" => {
            let count = input.get("count").and_then(|v| v.as_u64()).unwrap_or(10) as usize;
            let start = store.len().saturating_sub(count);
            serde_json::to_string(&store[start..]).unwrap_or_default()
        }
        "search_history" => {
            let query = input.get("query").and_then(|v| v.as_str()).unwrap_or("");
            let lower = query.to_lowercase();
            let results: Vec<&TranscriptSegment> = store
                .iter()
                .filter(|s| {
                    s.text.to_lowercase().contains(&lower)
                        || s.translation
                            .as_ref()
                            .map_or(false, |t| t.to_lowercase().contains(&lower))
                })
                .collect();
            serde_json::to_string(&results).unwrap_or_default()
        }
        "get_context" => {
            let idx = input.get("segment_index").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let window = input.get("window_size").and_then(|v| v.as_u64()).unwrap_or(5) as usize;
            let start = idx.saturating_sub(window);
            let end = (idx + 1).min(store.len());
            serde_json::to_string(&store[start..end]).unwrap_or_default()
        }
        _ => serde_json::json!({"error": format!("Unknown tool: {}", name)}).to_string(),
    }
}

const SYSTEM_PROMPT: &str = "You are an AI interview assistant. You help users understand and respond to conversations happening in real-time. You have access to the transcript of the ongoing conversation.\n\nWhen asked about something said in the conversation, use the available tools to look up the transcript context. Provide concise, helpful analysis and suggested responses.\n\nKeep responses brief and actionable - the user is in an active conversation.";

#[tauri::command]
pub async fn ai_sync_transcript(
    segments: Vec<TranscriptSegment>,
    store: State<'_, AiTranscriptStore>,
) -> Result<(), String> {
    let mut s = store.0.lock().map_err(|e| e.to_string())?;
    *s = segments;
    Ok(())
}

#[tauri::command]
pub async fn ai_chat(
    api_key: String,
    model: String,
    question: String,
    context: Vec<TranscriptSegment>,
) -> Result<String, String> {
    let store_snapshot: Vec<TranscriptSegment> = context;

    let context_str = if !store_snapshot.is_empty() {
        let lines: Vec<String> = store_snapshot
            .iter()
            .map(|s| {
                let speaker = s.speaker.map_or("?".into(), |sp| sp.to_string());
                let translation = s
                    .translation
                    .as_ref()
                    .map_or(String::new(), |t| format!(" → {}", t));
                format!("[Speaker {}] {}{}", speaker, s.text, translation)
            })
            .collect();
        format!("\n\nRecent conversation context:\n{}", lines.join("\n"))
    } else {
        String::new()
    };

    let user_content = format!("{}{}", question, context_str);

    let client = reqwest::Client::new();
    let mut messages = vec![AnthropicMessage {
        role: "user".into(),
        content: serde_json::Value::String(user_content),
    }];

    let max_iterations = 5;
    for _ in 0..max_iterations {
        let req_body = ChatApiRequest {
            model: model.clone(),
            max_tokens: 2048,
            system: SYSTEM_PROMPT.into(),
            messages: messages.clone(),
            tools: build_tools(),
        };

        let res = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&req_body)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, body));
        }

        let api_res: ChatApiResponse = res
            .json()
            .await
            .map_err(|e| format!("Parse error: {}", e))?;

        if api_res.stop_reason.as_deref() == Some("tool_use") {
            let assistant_content: Vec<serde_json::Value> = api_res
                .content
                .iter()
                .map(|b| {
                    if b.block_type == "tool_use" {
                        serde_json::json!({
                            "type": "tool_use",
                            "id": b.id,
                            "name": b.name,
                            "input": b.input,
                        })
                    } else {
                        serde_json::json!({
                            "type": "text",
                            "text": b.text.as_deref().unwrap_or(""),
                        })
                    }
                })
                .collect();

            messages.push(AnthropicMessage {
                role: "assistant".into(),
                content: serde_json::Value::Array(assistant_content),
            });

            let tool_results: Vec<serde_json::Value> = api_res
                .content
                .iter()
                .filter(|b| b.block_type == "tool_use")
                .map(|b| {
                    let result = execute_tool(
                        b.name.as_deref().unwrap_or(""),
                        b.input.as_ref().unwrap_or(&serde_json::Value::Null),
                        &store_snapshot,
                    );
                    serde_json::json!({
                        "type": "tool_result",
                        "tool_use_id": b.id,
                        "content": result,
                    })
                })
                .collect();

            messages.push(AnthropicMessage {
                role: "user".into(),
                content: serde_json::Value::Array(tool_results),
            });
        } else {
            let text: String = api_res
                .content
                .iter()
                .filter_map(|b| b.text.as_ref())
                .cloned()
                .collect::<Vec<_>>()
                .join("");
            return Ok(text);
        }
    }

    Err("Too many tool use iterations".into())
}
