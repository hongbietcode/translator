# Plan: Tray-First Architecture + UI Redesign

## Context
Current app has a single always-on-top window mixing 3 views (overlay/settings/history) with cramped titlebar controls. User wants:
1. **Tray-first**: App starts as tray icon only — no window shown
2. **Separate windows**: Live Caption = overlay window, Settings = native-style window
3. **Tray controls everything**: Start/stop translation, language, audio, AI — all from tray
4. **Reference UI**: Transcrybe-style settings (clean native macOS look), overlay with lang selector inline

## Architecture Change

**Current**: 1 window → 3 views (overlay/settings/history) via React state
**New**: 0 windows on launch → tray spawns windows on demand

### Windows
| Window | When | Style | Size |
|--------|------|-------|------|
| none | app start | tray only | - |
| `caption` | Start Live Translate | transparent, no decorations, always-on-top | 600×200 |
| `settings` | Settings menu click | decorations, normal window, NOT always-on-top | 480×600 |

### Tray Menu (redesigned)
```
▶ Start Live Translate    ⌘↵
━━━━━━━━━━━━━━━━━━━━━━━━
Source Language        ▶  ✓ Auto-detect / EN / JA / KO / ZH
Target Language        ▶  ✓ Vietnamese / EN / JA / KO / ZH
Audio Input            ▶  ✓ System / Mic / Both
━━━━━━━━━━━━━━━━━━━━━━━━
✓ AI Assistant             ⌘⇧A
━━━━━━━━━━━━━━━━━━━━━━━━
Settings…                  ⌘,
View History               ⌘H
━━━━━━━━━━━━━━━━━━━━━━━━
Quit Translator            ⌘Q
```

When live translate active, tray changes to:
```
■ Stop Live Translate     ⌘↵
```

## Phase 1: Tauri Backend — Multi-Window + Tray-First

### Files to modify
- `src-tauri/tauri.conf.json` — Remove main window from config (no window on start)
- `src-tauri/src/lib.rs` — Remove app menu, change activation policy to `Accessory`, create windows dynamically
- `src-tauri/src/tray.rs` — Add window spawn logic, Start/Stop state, History menu item

### Key changes
1. **tauri.conf.json**: Empty `windows: []` — no window on launch
2. **lib.rs**: `ActivationPolicy::Accessory` (tray-only, no dock icon)
3. **lib.rs**: Remove `build_menu()` entirely — no app menu needed for tray app
4. **tray.rs**:
   - `handle_tray_event` spawns windows:
     - `"start"` → create/show `caption` window (transparent, alwaysOnTop, no decorations, 600×200)
     - `"settings"` → create/show `settings` window (decorations, normal, 480×600)
     - `"view-history"` → create/show `settings` window on history tab
   - Track `is_translating` state in tray to toggle Start/Stop label
   - Rebuild tray menu when translation starts/stops

### New Tauri command
- `commands/window.rs`: `open_caption_window`, `open_settings_window`, `close_window`

## Phase 2: Frontend — Split Into 2 Entry Points

### Files to create
- `src/caption.tsx` — Caption window entry (overlay + transcript only)
- `src/settings-app.tsx` — Settings window entry (settings + history views)
- `src/caption.html` — HTML entry for caption window
- `src/settings.html` — HTML entry for settings window

### Files to modify
- `src/App.tsx` — Refactor: becomes the caption-only app (transcript + AI panel)
- `src/components/overlay-view.tsx` — Simplify: remove settings/history nav, add inline lang selector
- `src/components/titlebar.tsx` — Simplify: caption titlebar only (status + lang + start/stop + close)
- `src/components/settings-view.tsx` — Standalone: native macOS style with toolbar, remove back button
- `vite.config.ts` — Multi-page: `caption.html` + `settings.html`
- `src-tauri/tauri.conf.json` — Update `frontendDist` for multi-page

### Caption Window UI (overlay-view redesign)
```
┌──────────────────────────────────────────┐
│ ● EN → VI  [System ▾] [■ Stop] [✕]      │  ← inline lang selector on titlebar
├──────────────────────────────────────────┤
│                                          │
│  Transcript text here with animation...  │
│                                          │
├──────────────────────────────────────────┤
│ 💬 Listening...                          │  ← provisional bar
└──────────────────────────────────────────┘
```

When AI enabled, split layout stays (60/40).

### Settings Window UI (single scroll, native title bar)
```
┌──────────────────────────────────────────┐
│  Translator Settings                     │  ← native decorations: true
├──────────────────────────────────────────┤
│  ┌─ API Key ──────────────────────────┐  │
│  │ [••••••••••] [👁]                  │  │
│  └────────────────────────────────────┘  │
│  ┌─ Languages ────────────────────────┐  │
│  │ Source [Auto ▾]  Target [VI ▾]     │  │
│  └────────────────────────────────────┘  │
│  ┌─ Audio Source ─────────────────────┐  │
│  │ [System] [Mic] [Both]             │  │
│  └────────────────────────────────────┘  │
│  ┌─ Display ──────────────────────────┐  │
│  │ Opacity   [━━━●━━]                │  │
│  │ Font Size [━━━●━]                  │  │
│  │ Show Original [ON]                 │  │
│  └────────────────────────────────────┘  │
│  ┌─ AI Assistant ─────────────────────┐  │
│  │ Enable [ON]  Key [•••] Model [▾]  │  │
│  └────────────────────────────────────┘  │
│  ┌─ History ──────────────────────────┐  │
│  │ [Session list inline]             │  │
│  └────────────────────────────────────┘  │
│         [Save & Close]                   │
└──────────────────────────────────────────┘
```

History embedded as last card in settings scroll.

## Phase 3: CSS — Redesign Styles

### Files to modify
- `src/styles/components.css` — Refactor caption styles, add settings-window styles
- `src/globals.css` — Keep as-is

### Caption styles
- Simplified titlebar with inline lang selector
- Remove settings/history/clear buttons from caption titlebar

### Settings styles
- Native macOS look: sidebar + content area
- Proper spacing, labels, sliders (range inputs)
- Sections with headers like Transcrybe screenshot

## Phase 4: History Integration

### Files to modify
- `src/components/history-view.tsx` — Embed in settings window sidebar tab

History becomes a tab in the settings window sidebar, not a separate view.

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `src/caption.tsx` | Caption window React entry |
| `src/settings-app.tsx` | Settings window React entry |
| `caption.html` | Caption HTML entry |
| `settings.html` | Settings HTML entry |
| `src-tauri/src/commands/window.rs` | Window spawn commands |

### Modify
| File | Change |
|------|--------|
| `src-tauri/tauri.conf.json` | Empty windows, multi-page frontendDist |
| `src-tauri/src/lib.rs` | Remove menu, Accessory policy, no default window |
| `src-tauri/src/tray.rs` | Window spawning, start/stop state |
| `src-tauri/src/commands/mod.rs` | Add window module |
| `src/App.tsx` | Caption-only (rename to caption app) |
| `src/components/overlay-view.tsx` | Remove nav, inline lang |
| `src/components/titlebar.tsx` | Simplify for caption |
| `src/components/settings-view.tsx` | Sidebar tabs, native style |
| `src/components/history-view.tsx` | Embed in settings |
| `src/styles/components.css` | Redesign both windows |
| `vite.config.ts` | Multi-page build |

### Delete
| File | Reason |
|------|--------|
| `src/main.tsx` | Replaced by caption.tsx + settings-app.tsx |

## Verification
1. `cargo check` — Rust compiles
2. `npx tsc --noEmit` — TS compiles
3. `npm run tauri dev` — App starts as tray icon only (no window)
4. Click "Start Live Translate" in tray → caption window appears
5. Click "Settings" in tray → settings window appears (separate, with native decorations)
6. Change language in tray → caption window updates
7. Change language in settings → tray check marks update
8. Stop translation → caption window closes
9. Close settings window → tray stays active
10. Quit from tray → app exits
