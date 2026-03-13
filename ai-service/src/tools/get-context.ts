import type { TranscriptContext } from "../types.js";
import { getAllTranscript } from "./get-transcript.js";

export function getContext(segmentIndex: number, windowSize = 5): TranscriptContext[] {
  const all = getAllTranscript();
  const start = Math.max(0, segmentIndex - windowSize);
  const end = Math.min(all.length, segmentIndex + 1);
  return all.slice(start, end);
}
