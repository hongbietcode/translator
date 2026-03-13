import express from "express";
import cors from "cors";
import { configure, streamChat } from "./anthropic-client.js";
import { updateTranscript } from "./tools/get-transcript.js";
import type { ChatRequest, ServiceConfig, TranscriptContext } from "./types.js";

const PORT = Number(process.env.PORT) || 9999;
const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.post("/config", (req, res) => {
	const { apiKey, model } = req.body as ServiceConfig;
	if (!apiKey) {
		res.status(400).json({ error: "apiKey is required" });
		return;
	}
	configure(apiKey, model);
	res.json({ status: "configured" });
});

app.post("/transcript", (req, res) => {
	const segments = req.body as TranscriptContext[];
	updateTranscript(segments);
	res.json({ status: "ok" });
});

app.post("/chat", (req, res) => {
	const chatReq = req.body as ChatRequest;
	if (!chatReq.question) {
		res.status(400).json({ error: "question is required" });
		return;
	}

	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});

	streamChat(chatReq, res);
});

app.listen(PORT, () => {
	console.log(`AI service running on http://localhost:${PORT}`);
});
