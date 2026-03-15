import { useState, useCallback, useRef } from "react";
import type { TranscriptSegment } from "./use-soniox";

const AI_SERVICE_URL = "http://localhost:9999";

export interface AiMessage {
	role: "user" | "assistant";
	content: string;
}

export function useAiService() {
	const [messages, setMessages] = useState<AiMessage[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [isConfigured, setIsConfigured] = useState(false);
	const abortRef = useRef<AbortController | null>(null);

	const configure = useCallback(async (apiKey: string, model: string) => {
		try {
			const res = await fetch(`${AI_SERVICE_URL}/config`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ apiKey, model }),
			});
			setIsConfigured(res.ok);
			return res.ok;
		} catch {
			setIsConfigured(false);
			return false;
		}
	}, []);

	const syncTranscript = useCallback(async (segments: TranscriptSegment[]) => {
		try {
			await fetch(`${AI_SERVICE_URL}/transcript`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(
					segments.map((s) => ({
						text: s.original,
						translation: s.translation ?? undefined,
						speaker: s.speaker ?? undefined,
						timestamp: s.createdAt,
					})),
				),
			});
		} catch {
			// silent
		}
	}, []);

	const askAi = useCallback(async (question: string, context: { text: string; translation?: string; speaker?: number; timestamp: number }[]) => {
		if (abortRef.current) abortRef.current.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setMessages((prev) => [...prev, { role: "user", content: question }]);
		setIsStreaming(true);

		let assistantText = "";
		setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

		try {
			const res = await fetch(`${AI_SERVICE_URL}/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ question, context }),
				signal: controller.signal,
			});

			const reader = res.body?.getReader();
			if (!reader) return;

			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.startsWith("data: ")) continue;
					try {
						const data = JSON.parse(line.slice(6));
						if (data.type === "text") {
							assistantText += data.text;
							setMessages((prev) => {
								const next = [...prev];
								next[next.length - 1] = { role: "assistant", content: assistantText };
								return next;
							});
						}
					} catch {
						// skip malformed
					}
				}
			}
		} catch (err) {
			if ((err as Error).name !== "AbortError") {
				assistantText += "\n\n[Error connecting to AI service]";
				setMessages((prev) => {
					const next = [...prev];
					next[next.length - 1] = { role: "assistant", content: assistantText };
					return next;
				});
			}
		}

		setIsStreaming(false);
		abortRef.current = null;
	}, []);

	const stopStreaming = useCallback(() => {
		if (abortRef.current) {
			abortRef.current.abort();
			abortRef.current = null;
			setIsStreaming(false);
		}
	}, []);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	const checkHealth = useCallback(async () => {
		try {
			const res = await fetch(`${AI_SERVICE_URL}/health`);
			return res.ok;
		} catch {
			return false;
		}
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
		checkHealth,
	};
}
