export interface TranscriptContext {
  text: string;
  translation?: string;
  speaker?: number;
  timestamp: number;
}

export interface ChatRequest {
  question: string;
  context: TranscriptContext[];
  systemPrompt?: string;
}

export interface ServiceConfig {
  apiKey: string;
  model?: string;
}
