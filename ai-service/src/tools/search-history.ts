import type { TranscriptContext } from "../types.js";
import { getAllTranscript } from "./get-transcript.js";

export function searchHistory(query: string): TranscriptContext[] {
  const lower = query.toLowerCase();
  return getAllTranscript().filter(
    (seg) =>
      seg.text.toLowerCase().includes(lower) ||
      (seg.translation && seg.translation.toLowerCase().includes(lower)),
  );
}
