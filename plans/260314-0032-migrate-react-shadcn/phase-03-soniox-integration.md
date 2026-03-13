# Phase 3: Soniox Integration (Dual-Path)

## Priority: High | Status: Complete

## Overview

Two audio paths require two Soniox integration approaches:

1. **Microphone path**: Use `@soniox/react` `useRecording` hook — it handles mic capture + WebSocket streaming natively
2. **System audio path**: Keep existing WebSocket logic (Tauri captures → Channel → frontend streams to Soniox via raw WebSocket)

## Key Insight: Soniox React SDK Limitation

The `@soniox/react` SDK's `useRecording` hook captures audio from the **browser's microphone API** (getUserMedia). It cannot access ScreenCaptureKit system audio. So:

- **Mic mode**: Full SDK experience — `useRecording()` with translation config
- **System audio mode**: Raw WebSocket with PCM from Tauri Channel (same as current `soniox.js`)

## Steps

1. **Create `src/lib/soniox-websocket-client.ts`**
   - Port `src/js/soniox.js` → TypeScript class `SonioxWebSocketClient`
   - Same logic: connect, sendAudio, disconnect, session reset, context carryover, reconnect
   - Type-safe callbacks: `onOriginal`, `onTranslation`, `onProvisional`, `onStatusChange`, `onError`
   - Remove singleton pattern, instantiate in hook

2. **Create `src/hooks/use-soniox.ts`** — unified hook for both paths
   ```typescript
   interface UseSonioxOptions {
     apiKey: string;
     sourceLanguage: string;
     targetLanguage: string;
     customContext?: { domain: string; terms: string[] } | null;
     source: 'system' | 'microphone';
   }

   interface UseSonioxResult {
     status: 'disconnected' | 'connecting' | 'connected' | 'error';
     connect: () => void;
     disconnect: () => void;
     sendAudio: (pcm: ArrayBuffer) => void;  // for system audio path
     // Transcript state
     segments: TranscriptSegment[];
     provisionalText: string;
     provisionalSpeaker: string | null;
   }
   ```

3. **Microphone path using Soniox React SDK**
   - When `source === 'microphone'`:
     - Use `useRecording({ model: 'stt-rt-v4', translation: { type: 'one_way', target_language }, language_hints, enable_speaker_diarization: true })`
     - Map `groups.original?.text` → original text, `groups.translation?.text` → translation
     - SDK handles mic capture, WebSocket, reconnect natively
   - **API key challenge**: SDK expects `SonioxProvider` with temp key function. For desktop app, create a simple provider that returns the stored API key directly:
     ```typescript
     <SonioxProvider apiKey={async () => settings.soniox_api_key}>
     ```

4. **System audio path using raw WebSocket**
   - When `source === 'system'`:
     - Instantiate `SonioxWebSocketClient`
     - Hook into `useAudioCapture` to receive PCM chunks
     - Forward PCM via `client.sendAudio()`
     - Same session reset / context carryover logic as current

5. **Unified transcript state**
   - Both paths feed into the same `segments` / `provisionalText` state
   - History and transcript persistence hooks consume this unified state

## Risk: API Key with Soniox React SDK

The Soniox React SDK is designed for web apps with a backend that generates temp keys. For this desktop app, we pass the raw API key directly. This works because:
- Desktop app, no public exposure
- Same approach as current vanilla JS implementation
- `SonioxProvider apiKey` accepts an async function returning a key string

## Success Criteria

- [ ] System audio mode: PCM from Tauri → WebSocket → translation results
- [ ] Microphone mode: Soniox SDK captures mic → translation results
- [ ] Session reset works for system audio path
- [ ] Both paths produce same transcript data shape

## Related Files

- `src/lib/soniox-websocket-client.ts` — new (ported from `src/js/soniox.js`)
- `src/hooks/use-soniox.ts` — new
- `src/App.tsx` — wraps with `SonioxProvider`
