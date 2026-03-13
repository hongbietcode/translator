import type { TranscriptContext } from "../types.js";

let transcriptStore: TranscriptContext[] = [];

export function updateTranscript(segments: TranscriptContext[]) {
  transcriptStore = segments;
}

export function getRecentTranscript(count: number): TranscriptContext[] {
  return transcriptStore.slice(-count);
}

export function getTranscriptAround(index: number, window: number): TranscriptContext[] {
  const start = Math.max(0, index - window);
  const end = Math.min(transcriptStore.length, index + window + 1);
  return transcriptStore.slice(start, end);
}

export function getAllTranscript(): TranscriptContext[] {
  return transcriptStore;
}
