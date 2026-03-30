use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    temperature: f64,
    messages: Vec<ChatMessage>,
}

#[derive(Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatResponseMessage,
}

#[derive(Deserialize)]
struct ChatResponseMessage {
    content: String,
}

const MAX_RETRIES: u32 = 3;
const TRANSIENT_CODES: &[u16] = &[408, 429, 500, 502, 503, 504];

fn build_system_prompt(language: &str) -> String {
    let lang_hint = match language {
        "en" => "Output in English.",
        "vi" => "Output in Vietnamese.",
        _ => "Preserve the original language.",
    };
    format!(
        "Fix spelling and grammar errors in the following speech-to-text transcript. \
         Output ONLY the corrected text, nothing else. \
         Preserve the original meaning. {}",
        lang_hint
    )
}

async fn try_correct(
    client: &Client,
    url: &str,
    api_key: &str,
    model: &str,
    system_prompt: &str,
    text: &str,
) -> Result<String, (String, bool)> {
    let request = ChatRequest {
        model: model.to_string(),
        temperature: 0.1,
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: system_prompt.to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: text.to_string(),
            },
        ],
    };

    let response = client
        .post(url)
        .bearer_auth(api_key)
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            let is_transient = e.is_timeout() || e.is_connect();
            (format!("Request failed: {}", e), is_transient)
        })?;

    let status = response.status().as_u16();
    if !response.status().is_success() {
        let is_transient = TRANSIENT_CODES.contains(&status);
        let body = response.text().await.unwrap_or_default();
        return Err((format!("HTTP {}: {}", status, body), is_transient));
    }

    let chat_response: ChatResponse = response
        .json()
        .await
        .map_err(|e| (format!("Failed to parse response: {}", e), false))?;

    chat_response
        .choices
        .first()
        .map(|c| c.message.content.trim().to_string())
        .ok_or_else(|| ("No choices in response".to_string(), false))
}

/// Correct transcript via OpenAI-compatible LLM API with retry
#[tauri::command]
pub async fn correct_transcript(
    text: String,
    api_key: String,
    base_url: String,
    model: String,
    language: String,
) -> Result<String, String> {
    if text.trim().is_empty() {
        return Ok(text);
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = format!("{}/chat/completions", base_url.trim_end_matches('/'));
    let system_prompt = build_system_prompt(&language);

    for attempt in 0..MAX_RETRIES {
        match try_correct(&client, &url, &api_key, &model, &system_prompt, &text).await {
            Ok(corrected) => return Ok(corrected),
            Err((err, is_transient)) => {
                if !is_transient || attempt == MAX_RETRIES - 1 {
                    eprintln!("LLM correction failed: {}", err);
                    return Ok(text);
                }
                let delay = Duration::from_millis(500 * 2u64.pow(attempt));
                tokio::time::sleep(delay).await;
            }
        }
    }

    Ok(text)
}
