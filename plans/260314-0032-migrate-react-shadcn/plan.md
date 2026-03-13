# Migrate Frontend: Vanilla JS → React TS + shadcn/ui + Tailwind CSS + Soniox React SDK

## Summary

Replace the vanilla HTML/CSS/JS frontend with a React TypeScript app using Vite, shadcn/ui, and Tailwind CSS. Replace the hand-rolled Soniox WebSocket client with the official `@soniox/react` SDK. Rust backend stays **unchanged** — all audio capture, settings persistence, and transcript logic remain as-is.

## Current State

- **Frontend**: `src/` — vanilla HTML + CSS + JS (5 files: app.js, soniox.js, ui.js, settings.js, history.js + index.html + main.css)
- **Backend**: `src-tauri/` — Rust with Tauri 2, ScreenCaptureKit, cpal, settings, transcript commands
- **Soniox connection**: Custom WebSocket client in `src/js/soniox.js` with session reset, context carryover, reconnect
- **tauri.conf.json**: `frontendDist: "../src"`, `withGlobalTauri: true`

## Architecture After Migration

```
src/                          # React + Vite
├── index.html
├── main.tsx
├── App.tsx
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── overlay-view.tsx      # Main transcript view
│   ├── settings-view.tsx     # Settings form
│   ├── history-view.tsx      # History panel
│   ├── titlebar.tsx          # Custom titlebar + controls
│   ├── source-selector.tsx   # Audio source dropdown
│   └── transcript-display.tsx # Transcript rendering
├── hooks/
│   ├── use-settings.ts       # Tauri IPC settings
│   ├── use-audio-capture.ts  # Tauri IPC audio start/stop
│   ├── use-soniox.ts         # Soniox React SDK wrapper
│   └── use-history.ts        # In-memory history state
├── lib/
│   └── tauri.ts              # Tauri invoke/listen helpers
├── styles/
│   └── globals.css           # Tailwind base + custom vars
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── components.json           # shadcn/ui config
```

## Key Decisions

1. **Soniox React SDK**: Use `@soniox/react` `useRecording` hook for mic-only mode. For **system audio** (ScreenCaptureKit), the SDK cannot help — it only captures mic via browser API. System audio path keeps the current Tauri Channel → WebSocket approach, but refactored into a custom hook.
2. **Two audio paths**:
   - **Microphone**: Soniox React SDK `useRecording()` handles mic capture + WebSocket streaming natively
   - **System audio**: Rust captures via ScreenCaptureKit → Tauri Channel → frontend sends PCM to Soniox WebSocket (keep existing `soniox.js` logic as a TypeScript module)
3. **shadcn/ui**: Use Button, Select, Slider, Switch, Sheet, Tabs, DropdownMenu, ScrollArea, Input, Label, RadioGroup
4. **Tailwind CSS**: Replace entire `main.css` with Tailwind utility classes + CSS variables for theming

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Scaffold React + Vite + Tailwind + shadcn/ui](phase-01-scaffold-react-vite.md) | Complete | S |
| 2 | [Port Tauri IPC hooks & settings](phase-02-tauri-hooks.md) | Complete | S |
| 3 | [Implement Soniox integration (dual-path)](phase-03-soniox-integration.md) | Complete | M |
| 4 | [Build UI components with shadcn/ui](phase-04-ui-components.md) | Complete | L |
| 5 | [Wire everything in App + routing](phase-05-wire-app.md) | Complete | M |
| 6 | [Update tauri.conf.json + cleanup](phase-06-config-cleanup.md) | Complete | S |
| 7 | [Test & verify](phase-07-test-verify.md) | Complete | S |

## Risk Assessment

- **Soniox React SDK limitation**: Only captures mic audio. System audio must use existing Tauri Channel + raw WebSocket approach. Two code paths adds complexity.
- **API key exposure**: Soniox React SDK expects a temp key endpoint. For desktop app connecting directly, we'll bypass SonioxProvider and use the raw API key from settings (same as current approach). Use `@soniox/react` only for mic, keep direct WebSocket for system audio.
- **CSS migration**: 1100+ lines of custom CSS → Tailwind. Large but mechanical.
