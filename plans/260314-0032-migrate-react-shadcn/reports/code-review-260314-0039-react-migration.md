# Code Review — React/TypeScript Migration

**Date:** 2026-03-14
**Scope:** src/App.tsx, src/hooks/*, src/lib/soniox-websocket-client.ts, src/components/*

---

## Overall Assessment

Migration is solid. Architecture is clean, hooks are well-scoped, and the WebSocket client port is faithful. A few correctness bugs and one race condition need addressing.

---

## Critical Issues

None.

---

## High Priority

### 1. Stale `stop` closure in `handleSourceChange` (App.tsx:100–103)
`stop` is captured via `useCallback` but `start` inside it runs asynchronously after `stop()` resolves. By the time `setTimeout(() => start(), 100)` fires, `start` may be a stale reference (settings/source changed). Use a ref for `start` or restructure: call `start()` inside the `.then()` directly without `setTimeout`, or use `useRef` to always call the latest version.

```ts
// current — fragile
stop().then(() => {
  setCurrentSource(source);
  setCurrentDevice(device);
  setTimeout(() => start(), 100);   // stale start possible, 100ms magic number
});

// safer — pass args to avoid stale source/device
stop().then(() => {
  setCurrentSource(source);
  setCurrentDevice(device);
  startWithArgs(source, device);    // pass explicit args
});
```

### 2. Double `onTranslation` handler monkey-patching (use-soniox.ts:99–106)
The second `useEffect` reads `clientRef.current.onTranslation` and wraps it, but both effects run once on mount with empty deps. If hooks ever remount, the wrap runs again stacking handlers. Prefer composing in the original `onopen` assignment or using a single ref-based dispatch:

```ts
client.onTranslation = (text) => {
  // all logic here, read refs for external callbacks
  onTranslationRef.current?.(text);
  // ... local segment update
};
```

### 3. `seamlessReset` timer not cancelled on unmount
`stopSessionTimer()` is called inside `disconnect()` but if `disconnect()` is not called before unmount (e.g., error path), the timer can fire on a dead instance invoking `doConnect` on a torn-down object. The cleanup in `useSoniox` calls `client.disconnect()`, which does call `stopSessionTimer`, so this is currently safe — but fragile.

---

## Medium Priority

### 4. `updateSettings` has a stale closure risk (use-settings.ts:19–26)
`updateSettings` closes over `settings` state. Rapid consecutive calls (e.g., user tabs through inputs) will produce stale merges. Fix: use functional updater or pass full settings object from call site.

```ts
const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
  setSettings((prev) => {
    const merged = { ...prev, ...newSettings };
    invoke("save_settings", { newSettings: merged });   // fire-and-forget acceptable here
    return merged;
  });
}, []);
```

### 5. `onTranslation` in `use-soniox.ts` always matches first `"original"` segment (line 47)
When multiple speakers produce interleaved originals, translations always update `idx=0` original segment. Should match on speaker or recency — or the API delivers translations in the same order as originals, which should be documented.

### 6. `pcm.buffer as ArrayBuffer` may include extra bytes (App.tsx:47)
`Uint8Array.buffer` is the underlying `ArrayBuffer` which may be larger than `pcm` if the array is a view into a larger buffer (e.g., from Tauri's channel). Use `pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength)` or pass `pcm` directly if the WebSocket can accept `Uint8Array`.

### 7. `handleClose` calls `stop()` then `close()` without awaiting stop (App.tsx:122–123)
`await stop()` is called but `getCurrentWindow().close()` runs immediately after — `stop()` is already awaited correctly. This is fine, but if `close()` throws it's unhandled.

---

## Low Priority

### 8. `isRunningRef` duplicates `isRunning` state
Both are maintained in parallel (lines 58–59, 81). `isRunningRef` is used to avoid stale closure issues in `toggle`/`handleSourceChange`, which is correct, but the dual update is error-prone. Consider only keeping the ref and deriving display state from it via a `useSyncExternalStore` pattern or a single ref with a setState call.

### 9. `SonioxWebSocketClient.isConnected` is public mutable field
No consumer reads it directly, but exposing it as public makes it possible to externally mutate. Make it private and expose via getter if needed.

### 10. `cleanupSegments` uses `Date.now()` snapshot for 10-second stale check (use-soniox.ts:124)
10-second stale removal of `"original"` segments (awaiting translation) is aggressive if network is slow. No visible config. Consider exposing as a named constant with a comment explaining why 10s.

---

## Security

- API key passed as plain string in WebSocket JSON config — acceptable for a local desktop app; no server-side risk.
- `localStorage` used only for window position — no sensitive data.
- No XSS risk: all text is rendered via React (no `dangerouslySetInnerHTML`).

---

## Positive Observations

- `intentionalDisconnect` flag correctly prevents reconnect loops.
- Reconnect uses linear backoff with cap — good.
- `useRef` for callbacks avoids stale closure in audio data path.
- Segment cleanup logic (`cleanupSegments`) is well-contained and pure.
- History sessions capped at 30 — good.
- `useEffect` cleanup pattern for Tauri `listen` is correct.

---

## Recommended Actions (Priority Order)

1. Fix `handleSourceChange` stale `start` closure + remove `setTimeout` magic number
2. Consolidate `onTranslation` assignment in `use-soniox.ts` — remove monkey-patching
3. Fix `pcm.buffer` slice to avoid sending extra bytes
4. Fix `updateSettings` stale closure using functional updater

---

## Unresolved Questions

- Does the Soniox API guarantee translations arrive in the same order as originals? If not, issue #5 is a bug not just a risk.
- Is `seamlessReset` (3-min session rollover) actually needed per Soniox's API limits, or is it precautionary?
