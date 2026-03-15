import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TranscriptSegment } from "./use-soniox";

export interface AiMessage {
	role: "user" | "assistant";
	content: string;
}

export function useAiService() {
	const [messages, setMessages] = useState<AiMessage[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isConfigured, setIsConfigured] = useState(false);
	const configRef = useRef<{ apiKey: string; model: string } | null>(null);

	const configure = useCallback(async (apiKey: string, model: string) => {
		configRef.current = { apiKey, model };
		setIsConfigured(!!apiKey);
		return !!apiKey;
	}, []);

	const syncTranscript = useCallback(async (segments: TranscriptSegment[]) => {
		try {
			await invoke("ai_sync_transcript", {
				segments: segments.map((s) => ({
					text: s.original,
					translation: s.translation ?? null,
					speaker: s.speaker ?? null,
					timestamp: s.createdAt,
				})),
			});
		} catch {
			// silent
		}
	}, []);

	const askAi = useCallback(async (question: string, context: { text: string; translation?: string; speaker?: number; timestamp: number }[]) => {
		if (!configRef.current) return;

		setMessages((prev) => [...prev, { role: "user", content: question }]);
		setIsStreaming(true);
		setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

		try {
			const result = await invoke<string>("ai_chat", {
				apiKey: configRef.current.apiKey,
				model: configRef.current.model,
				question,
				context: context.map((c) => ({
					text: c.text,
					translation: c.translation ?? null,
					speaker: c.speaker ?? null,
					timestamp: c.timestamp,
				})),
			});

			setMessages((prev) => {
				const next = [...prev];
				next[next.length - 1] = { role: "assistant", content: result };
				return next;
			});
		} catch (err) {
			setMessages((prev) => {
				const next = [...prev];
				next[next.length - 1] = { role: "assistant", content: `[Error: ${err}]` };
				return next;
			});
		}

		setIsStreaming(false);
	}, []);

	const stopStreaming = useCallback(() => {
		setIsStreaming(false);
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	return {
		messages,
		isStreaming,
		isConfigured,
		configure,
		syncTranscript,
		askAi,
		stopStreaming,
		clearMessages,
	};
}
