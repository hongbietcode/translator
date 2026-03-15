const SONIOX_ENDPOINT = "wss://stt-rt.soniox.com/transcribe-websocket";
const MAX_RECONNECT = 3;
const RECONNECT_DELAY_MS = 2000;
const SESSION_DURATION_MS = 3 * 60 * 1000;
const CONTEXT_HISTORY_CHARS = 500;

export interface SonioxConfig {
  apiKey: string;
  sourceLanguage: string;
  targetLanguage: string;
  customContext?: { domain: string; terms: string[] } | null;
}

export type SonioxStatus = "disconnected" | "connecting" | "connected" | "error";

interface SonioxToken {
  text: string;
  is_final: boolean;
  translation_status: "original" | "translation";
  speaker?: number;
}

interface SonioxResponse {
  tokens?: SonioxToken[];
  error_code?: number;
  error_message?: string;
}

export class SonioxWebSocketClient {
  private ws: WebSocket | null = null;
  private config: SonioxConfig | null = null;
  isConnected = false;
  private reconnectAttempts = 0;
  private intentionalDisconnect = false;
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private recentTranslations: string[] = [];

  onOriginal: ((text: string, speaker: number | null) => void) | null = null;
  onTranslation: ((text: string) => void) | null = null;
  onProvisional: ((text: string, speaker: number | null) => void) | null = null;
  onStatusChange: ((status: SonioxStatus) => void) | null = null;
  onError: ((error: string) => void) | null = null;

  connect(config: SonioxConfig) {
    this.config = config;
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.recentTranslations = [];

    if (!config.apiKey) {
      this.setStatus("error");
      this.onError?.("API key is required.");
      return;
    }

    this.doConnect(config);
  }

  sendAudio(pcmData: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(pcmData);
    }
  }

  disconnect() {
    this.intentionalDisconnect = true;
    this.stopSessionTimer();

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(new ArrayBuffer(0));
        }
        this.ws.close(1000, "User disconnected");
      } catch (_) {
        /* ignore */
      }
      this.ws = null;
    }
    this.isConnected = false;
    this.setStatus("disconnected");
  }

  private doConnect(config: SonioxConfig, carryoverContext: string | null = null) {
    this.setStatus("connecting");

    let newWs: WebSocket;
    try {
      newWs = new WebSocket(SONIOX_ENDPOINT);
    } catch (err) {
      this.setStatus("error");
      this.onError?.(`Failed to create WebSocket: ${err}`);
      return;
    }

    newWs.onopen = () => {
      const configMsg: Record<string, unknown> = {
        api_key: config.apiKey,
        model: "stt-rt-v4",
        audio_format: "pcm_s16le",
        sample_rate: 16000,
        num_channels: 1,
        enable_endpoint_detection: true,
        max_endpoint_delay_ms: 1500,
        enable_speaker_diarization: true,
      };

      if (config.sourceLanguage && config.sourceLanguage !== "auto") {
        configMsg.language_hints = [config.sourceLanguage];
        configMsg.language_hints_strict = true;
      }

      if (config.targetLanguage) {
        configMsg.translation = {
          type: "one_way",
          target_language: config.targetLanguage,
        };
      }

      const domain = this.buildDomain(config.customContext, carryoverContext);
      const terms = config.customContext?.terms || [];
      if (domain || terms.length > 0) {
        configMsg.context = {
          ...(domain ? { domain } : {}),
          ...(terms.length > 0 ? { terms } : {}),
        };
      }

      newWs.send(JSON.stringify(configMsg));

      const oldWs = this.ws;
      if (oldWs && oldWs !== newWs) {
        try {
          if (oldWs.readyState === WebSocket.OPEN) {
            oldWs.send(new ArrayBuffer(0));
          }
          (oldWs as WebSocket & { _isOld?: boolean })._isOld = true;
          oldWs.close(1000, "Session reset");
        } catch (_) {
          /* ignore */
        }
      }

      this.ws = newWs;
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.setStatus("connected");
      this.startSessionTimer();
    };

    newWs.onmessage = (event) => {
      if ((newWs as WebSocket & { _isOld?: boolean })._isOld) return;
      try {
        const data: SonioxResponse = JSON.parse(event.data);
        if (data.error_code) {
          this.handleApiError(data);
          return;
        }
        this.handleResponse(data);
      } catch (_) {
        /* ignore parse errors */
      }
    };

    newWs.onerror = () => {
      if ((newWs as WebSocket & { _isOld?: boolean })._isOld) return;
      this.onError?.("WebSocket error occurred");
    };

    newWs.onclose = (event) => {
      if ((newWs as WebSocket & { _isOld?: boolean })._isOld) return;
      this.isConnected = false;
      if (this.ws === newWs) this.ws = null;

      if (this.intentionalDisconnect) {
        this.setStatus("disconnected");
        return;
      }

      if (event.code === 1000) {
        this.setStatus("disconnected");
      } else if (event.code === 1006) {
        this.tryReconnect("Connection lost unexpectedly");
      } else if (event.code === 4001 || event.code === 4003) {
        this.setStatus("error");
        this.onError?.("Invalid API key. Check Settings.");
      } else if (event.code === 4029) {
        this.setStatus("error");
        this.onError?.("Rate limit exceeded. Wait and retry.");
      } else if (event.code === 4002) {
        this.setStatus("error");
        this.onError?.("Subscription issue. Check Soniox account.");
      } else {
        this.tryReconnect(`Connection closed (code: ${event.code})`);
      }
    };
  }

  private handleResponse(data: SonioxResponse) {
    if (!data.tokens || data.tokens.length === 0) return;
    let originalText = "";
    let translationText = "";
    let provisionalText = "";
    let hasEnd = false;
    let speaker: number | null = null;

    for (const token of data.tokens) {
      if (token.text === "<end>") {
        hasEnd = true;
        continue;
      }
      if (token.speaker && (token.translation_status === "original" || !token.translation_status)) {
        speaker = token.speaker;
      }
      const isOriginal = token.translation_status === "original" || !token.translation_status;
      if (isOriginal) {
        if (token.is_final) originalText += token.text;
        else provisionalText += token.text;
      } else if (token.translation_status === "translation") {
        if (token.is_final) translationText += token.text;
      }
    }

    if (originalText.trim()) this.onOriginal?.(originalText, speaker);
    if (translationText.trim()) {
      this.onTranslation?.(translationText);
      this.addToHistory(translationText);
    }
    if (provisionalText.trim()) {
      this.onProvisional?.(provisionalText, speaker);
    } else if (originalText.trim() || translationText.trim() || hasEnd) {
      this.onProvisional?.("", null);
    }
  }

  private startSessionTimer() {
    this.stopSessionTimer();
    this.sessionTimer = setTimeout(() => this.seamlessReset(), SESSION_DURATION_MS);
  }

  private stopSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  private seamlessReset() {
    if (!this.config || this.intentionalDisconnect) return;
    const carryover = this.getCarryoverContext();
    this.doConnect(this.config, carryover);
  }

  private addToHistory(text: string) {
    this.recentTranslations.push(text);
    let total = this.recentTranslations.reduce((sum, t) => sum + t.length, 0);
    while (total > CONTEXT_HISTORY_CHARS && this.recentTranslations.length > 1) {
      const removed = this.recentTranslations.shift()!;
      total -= removed.length;
    }
  }

  private getCarryoverContext(): string | null {
    if (this.recentTranslations.length === 0) return null;
    return this.recentTranslations.join(" ").trim();
  }

  private buildDomain(
    customContext: { domain: string; terms: string[] } | null | undefined,
    carryoverContext: string | null,
  ): string | null {
    const parts: string[] = [];
    if (customContext?.domain) parts.push(customContext.domain);
    if (carryoverContext) parts.push(`Recent conversation context: ${carryoverContext}`);
    return parts.length > 0 ? parts.join(". ") : null;
  }

  private handleApiError(data: SonioxResponse) {
    const code = data.error_code || 0;
    const message = data.error_message || "Unknown API error";
    console.error("Soniox API error:", code, message);

    if (code === 408) {
      this.tryReconnect("Request timeout");
      return;
    }

    const userMessages: Record<number, string> = {
      401: "Invalid API key. Check Settings.",
      429: "Rate limit exceeded. Wait a moment.",
      402: "Insufficient credits. Check Soniox account.",
    };

    this.setStatus("error");
    this.onError?.(userMessages[code] || `Config error: ${message}`);
  }

  private tryReconnect(reason: string) {
    if (this.reconnectAttempts >= MAX_RECONNECT) {
      this.setStatus("error");
      this.onError?.(`${reason}. Reconnect failed after ${MAX_RECONNECT} attempts.`);
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * this.reconnectAttempts;
    this.setStatus("connecting");
    this.onError?.(`${reason}. Reconnecting (${this.reconnectAttempts}/${MAX_RECONNECT})...`);

    setTimeout(() => {
      if (!this.intentionalDisconnect && this.config) {
        const carryover = this.getCarryoverContext();
        this.doConnect(this.config, carryover);
      }
    }, delay);
  }

  private setStatus(status: SonioxStatus) {
    this.onStatusChange?.(status);
  }
}
