# dtateks/stt UI & Vocabulary Integration Research

**Date:** 2026-03-30
**Researcher:** Claude
**Status:** Complete

---

## Executive Summary

Analyzed dtateks/stt repository to extract recording bar UI design and vocabulary/terms configuration system. Key findings: bar uses HTML5 Canvas waveform animation with state-driven CSS styling (7 states), glassmorphism design, and Soniox STT integration via WebSocket with vocabulary support via `context.terms` parameter.

---

## 1. Recording Bar UI Design

### 1.1 HTML Structure (`/tmp/stt/ui/bar.html`)

The recording bar is a minimal floating HUD with this hierarchy:

```html
<div id="hud" class="hud" role="status" data-state="HIDDEN">
  <!-- Status indicator: 8x8px dot -->
  <span id="hud-status" class="hud-status" aria-hidden="true"></span>

  <!-- Waveform visualization -->
  <div class="hud-waveform" aria-hidden="true">
    <canvas id="waveform"></canvas>
  </div>

  <!-- Transcript content area -->
  <div class="hud-transcript" aria-live="polite">
    <span id="transcript-final" class="transcript-final"></span>     <!-- Main text -->
    <span id="transcript-interim" class="transcript-interim"></span> <!-- Interim (italic) -->
    <span id="transcript-prompt" class="transcript-prompt" hidden>Listening…</span>
  </div>

  <!-- State label (uppercase: "LISTENING", "PROCESSING", etc.) -->
  <span id="hud-state-label" class="hud-state-label" aria-hidden="true"></span>

  <!-- Vertical separator -->
  <div class="hud-sep" aria-hidden="true"></div>

  <!-- Action buttons -->
  <div class="hud-actions" role="group">
    <button id="hud-clear-btn" class="hud-btn hud-btn-clear" aria-label="Clear and restart listening">
      <!-- X-in-rect icon -->
    </button>
    <button id="hud-close-btn" class="hud-btn hud-btn-close" aria-label="Stop listening and close">
      <!-- X icon -->
    </button>
  </div>
</div>
```

**Layout:** Fixed overlay, flexbox, horizontal stack with 12px gaps.
**Window:** Transparent background, borderless, always-on-top floating window (native side).
**Accessibility:** Status div has `role="status"`, transcript has `aria-live="polite"`, buttons are aria-labeled.

### 1.2 CSS Design System (`/tmp/stt/ui/bar.css`)

#### Container (`.hud`)
```css
.hud {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);  /* 12px */
  padding: 0 var(--space-3) 0 var(--space-4);  /* 0 12px 0 16px */

  /* Glassmorphism surface */
  background: linear-gradient(180deg, rgba(14, 18, 24, 0.78), rgba(8, 10, 14, 0.72));
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-2xl);  /* 24px */
  box-shadow:
    0 0 0 1px rgba(56, 232, 255, 0.04),      /* Subtle cyan inner ring */
    0 10px 28px rgba(0, 0, 0, 0.42),         /* Depth shadow */
    0 2px 8px rgba(0, 0, 0, 0.28),           /* Near shadow */
    inset 0 1px 0 rgba(255, 255, 255, 0.06); /* Inset highlight */
}
```

#### Ambient Glow (State-driven via `::before` pseudo-element)
```css
.hud::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--duration-slow) var(--ease-out);  /* 300ms ease-out */
  z-index: -1;
}

/* Cyan glow during LISTENING */
.hud[data-state="LISTENING"]::before {
  opacity: 1;
  box-shadow: 0 0 40px rgba(56, 232, 255, 0.12), 0 0 80px rgba(56, 232, 255, 0.06);
}

/* Violet glow during PROCESSING */
.hud[data-state="PROCESSING"]::before {
  opacity: 1;
  box-shadow: 0 0 40px rgba(167, 139, 250, 0.15), 0 0 80px rgba(167, 139, 250, 0.08);
}

/* Green glow on SUCCESS */
.hud[data-state="SUCCESS"]::before {
  opacity: 1;
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.15);
}

/* Red glow on ERROR */
.hud[data-state="ERROR"]::before {
  opacity: 1;
  box-shadow: 0 0 40px rgba(239, 68, 68, 0.15);
}
```

#### Status Indicator (`.hud-status`)
8×8px circle with state-specific animation:

```css
.hud-status {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);  /* 9999px = circle */
  flex-shrink: 0;
  background: var(--text-disabled);   /* Default gray */
  transition: background var(--duration-normal) var(--ease-out);
  position: relative;
}

/* Pulse ring ::after (4px outer margin) */
.hud-status::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: var(--radius-full);
  border: 1px solid currentColor;
  opacity: 0;
  transform: scale(0.6);
}

/* CONNECTING: orange, pulse animation */
.hud[data-state="CONNECTING"] .hud-status {
  background: var(--color-warning-500);  /* #f59e0b */
  animation: hud-pulse 1.2s ease-in-out infinite;
}

/* LISTENING: cyan, breathe animation with glow */
.hud[data-state="LISTENING"] .hud-status {
  background: var(--color-cyan-400);     /* #38e8ff */
  box-shadow: 0 0 8px var(--color-cyan-400), 0 0 16px rgba(56, 232, 255, 0.4);
  animation: hud-breathe 2.4s ease-in-out infinite;
}

/* PROCESSING: violet, faster pulse */
.hud[data-state="PROCESSING"] .hud-status {
  background: var(--color-violet-400);   /* #a78bfa */
  box-shadow: 0 0 8px var(--color-violet-400);
  animation: hud-pulse 0.8s ease-in-out infinite;
}

/* INSERTING: cyan-lighter, fast pulse */
.hud[data-state="INSERTING"] .hud-status {
  background: var(--color-cyan-300);     /* #67eeff */
  animation: hud-pulse 0.6s ease-in-out infinite;
}

/* SUCCESS: green, no animation */
.hud[data-state="SUCCESS"] .hud-status {
  background: var(--color-success-500);  /* #10b981 */
  box-shadow: 0 0 8px var(--color-success-500);
  animation: none;
}

/* ERROR: red, 3x pulse */
.hud[data-state="ERROR"] .hud-status {
  background: var(--color-error-500);    /* #ef4444 */
  box-shadow: 0 0 8px var(--color-error-500);
  animation: hud-pulse 0.4s ease-in-out 3;
}

/* Pulse keyframes */
@keyframes hud-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}

/* Breathe keyframes (smoother for listening) */
@keyframes hud-breathe {
  0%, 100% { opacity: 1; box-shadow: 0 0 6px var(--color-cyan-400), 0 0 12px rgba(56, 232, 255, 0.3); }
  50%       { opacity: 0.8; box-shadow: 0 0 10px var(--color-cyan-400), 0 0 20px rgba(56, 232, 255, 0.5); }
}
```

#### Waveform Canvas (`.hud-waveform`)
```css
.hud-waveform {
  flex-shrink: 0;
  width: 56px;
  height: 28px;
  position: relative;
}

.hud-waveform canvas {
  display: block;
  width: 100%;
  height: 100%;
}
```

Canvas dimensions: **56px wide × 28px tall** (CSS). Device pixel ratio scaling applied in JS.

#### Transcript Area (`.hud-transcript`)
```css
.hud-transcript {
  flex: 1;  /* Grows to fill available space */
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.transcript-final {
  font-size: var(--font-size-base);   /* 14px */
  font-weight: var(--font-weight-medium);  /* 500 */
  color: var(--text-primary);  /* #e6edf3 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--line-height-tight);  /* 1.2 */
  letter-spacing: -0.01em;
}

.transcript-interim {
  font-size: var(--font-size-sm);  /* 12px */
  color: var(--text-tertiary);  /* #6e7681 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: var(--line-height-tight);
  font-style: italic;
}

.transcript-prompt {
  font-size: var(--font-size-sm);  /* 12px */
  color: var(--text-disabled);  /* #484f58 */
  line-height: var(--line-height-tight);
}

/* State-specific text colors */
.hud[data-state="SUCCESS"] .transcript-final {
  color: var(--color-success-300);  /* #6ee7b7 */
}

.hud[data-state="ERROR"] .transcript-final {
  color: var(--color-error-300);  /* #fca5a5 */
}

.hud[data-state="PROCESSING"] .transcript-final,
.hud[data-state="INSERTING"] .transcript-final {
  color: var(--text-secondary);  /* #8b949e */
}
```

#### State Label (`.hud-state-label`)
```css
.hud-state-label {
  font-size: var(--font-size-xs);  /* 11px */
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.06em;  /* Wider spacing */
  text-transform: uppercase;
  color: var(--text-disabled);  /* Default gray */
  flex-shrink: 0;
  transition: color var(--duration-normal) var(--ease-out);
}

.hud[data-state="LISTENING"] .hud-state-label { color: var(--color-cyan-400); }
.hud[data-state="PROCESSING"] .hud-state-label { color: var(--color-violet-400); }
.hud[data-state="INSERTING"] .hud-state-label { color: var(--color-cyan-300); }
.hud[data-state="SUCCESS"] .hud-state-label { color: var(--color-success-500); }
.hud[data-state="ERROR"] .hud-state-label { color: var(--color-error-500); }
```

#### Action Buttons (`.hud-btn`)
```css
.hud-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);  /* 8px */
  background: transparent;
  color: rgba(255, 255, 255, 0.46);
  cursor: pointer;
  padding: 0;
  touch-action: manipulation;
  transition:
    background var(--duration-fast) var(--ease-out),  /* 120ms */
    color var(--duration-fast) var(--ease-out),
    opacity var(--duration-fast) var(--ease-out);
}

.hud-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.68);
}

.hud-btn:active {
  background: rgba(255, 255, 255, 0.09);
}

.hud-btn:focus-visible {
  outline: 2px solid var(--border-focus);  /* Cyan */
  outline-offset: 2px;
}

/* SVG icon sizing */
.hud-btn svg {
  width: 13px;
  height: 13px;
  pointer-events: none;
}

.hud-btn-clear svg {
  width: 14px;
  height: 14px;
}
```

#### Overlay Mode (Passive vs Interactive)
```css
/* PASSIVE mode: click-through, buttons appear disabled */
.hud[data-overlay="passive"] .hud-btn {
  opacity: 0.55;
}

/* INTERACTIVE mode: buttons are clickable */
.hud[data-overlay="interactive"] .hud-btn {
  opacity: 1;
}
```

### 1.3 Waveform Animation (`/tmp/stt/ui/bar.ts` & `bar-render.ts`)

**Canvas size:** 56px × 28px (CSS), scaled to device pixel ratio.
**Bar count:** 12 bars
**Bar width:** 2px
**Max bar height:** 85% of canvas height
**Gap between bars:** Calculated to fill width evenly

#### Idle Waveform (no audio input)
```typescript
// Oscillating animation, no audio data
for (let i = 0; i < layout.barCount; i++) {
  const phase = (i / layout.barCount) * Math.PI * 2;
  const amplitude = (Math.sin(now * 1.2 + phase) * 0.5 + 0.5) * 4 + 2;

  // Gray color: rgba(110, 117, 129, 0.4)
  canvasCtx.fillStyle = "rgba(110, 117, 129, 0.4)";
  canvasCtx.roundRect(x, centerY - amplitude / 2, barWidth, amplitude, 1);
  canvasCtx.fill();
}
```

**Idle behavior:** Smooth sinusoidal animation, subtle gray bars, repeating wavelike motion.

#### Active Waveform (audio input during LISTENING)
```typescript
// Responsive to frequency data from audio analyser
const bucketSize = Math.max(1, Math.floor(data.length / barCount));

for (let i = 0; i < barCount; i++) {
  // Average frequency data for this bar's bucket
  let sum = 0;
  for (let j = bucketStart; j < bucketEnd; j++) {
    sum += data[j];
  }
  const avg = sum / bucketSize / 255;
  const barH = Math.max(2, avg * maxBarHeight);

  // Gradient: cyan → violet
  const gradient = canvasCtx.createLinearGradient(x, y1, x, y2);
  gradient.addColorStop(0, `rgba(56, 232, 255, ${0.4 + avg * 0.6})`);   // Cyan
  gradient.addColorStop(1, `rgba(167, 139, 250, ${0.3 + avg * 0.5})`);  // Violet

  canvasCtx.fillStyle = gradient;
  canvasCtx.roundRect(x, centerY - barH / 2, barWidth, barH, 1);
  canvasCtx.fill();
}
```

**Active behavior:**
- Responsive to frequency spectrum from Web Audio API
- Vertical gradient: **cyan (#38e8ff) top → violet (#a78bfa) bottom**
- Opacity changes with amplitude: 40%-100% for cyan, 30%-80% for violet
- Rounded bars (1px radius)

#### Colors Used
| Element | Color | Hex | RGB |
|---------|-------|-----|-----|
| Idle bars | Gray | - | rgba(110, 117, 129, 0.4) |
| Listening gradient (top) | Cyan | #38e8ff | rgba(56, 232, 255, ...) |
| Listening gradient (bottom) | Violet | #a78bfa | rgba(167, 139, 250, ...) |
| Processing bars | Gray | - | rgba(110, 117, 129, 0.35) |

### 1.4 Bar States & Visual Transitions

The bar has **7 states** driven by `data-state` attribute:

| State | Status Color | Status Animation | Label Color | Glow Color | Description |
|-------|--------------|------------------|-------------|-----------|---|
| HIDDEN | (hidden) | none | - | - | Bar not visible |
| CONNECTING | Orange #f59e0b | pulse (1.2s) | Gray | - | Awaiting permission/connection |
| LISTENING | Cyan #38e8ff | breathe (2.4s) | Cyan | Cyan glow | Actively recording audio |
| PROCESSING | Violet #a78bfa | pulse (0.8s) | Violet | Violet glow | LLM processing transcript |
| INSERTING | Cyan #67eeff | pulse (0.6s) | Cyan | - | Inserting text into app |
| SUCCESS | Green #10b981 | none | Green | Green glow | Insertion complete |
| ERROR | Red #ef4444 | pulse (0.4s, 3x) | Red | Red glow | Error occurred |

**Transparency:** Bar background always translucent (78% opacity gradient). No backdrop-filter used (caused flickering on first show in WebKit).

---

## 2. Vocabulary/Terms Configuration

### 2.1 Frontend Storage & UI (`/Users/huutri/code/translator/`)

The dtateks/stt app has a **Vocabulary dialog** in the main preferences window (index.html):

```html
<button id="action-open-settings" class="bottom-action">
  <svg>...</svg>
  Vocabulary
  <span id="vocab-badge"><!-- term count --></span>
</button>

<div id="settings-dialog" class="dialog" aria-modal="true">
  <h2>Vocabulary</h2>

  <section>
    <div class="dialog-section-title">Vocabulary terms</div>
    <div id="terms-tag-list" class="tag-list"></div>

    <div class="add-row">
      <input id="terms-add-input" placeholder="Add term…" />
      <button id="terms-add-btn">Add</button>
    </div>
  </section>

  <footer class="dialog-footer">
    <button id="dialog-reset">Reset to defaults</button>
    <button id="dialog-save">Save</button>
  </footer>
</div>
```

**Functionality:**
- Add/remove vocabulary terms in a tag list
- Save dialog triggers save to persistent storage
- Reset button restores defaults
- Badge shows term count on button

### 2.2 Soniox WebSocket Integration

#### Types (`/tmp/stt/ui/src/types.ts`)

```typescript
/* Config sent to Soniox server */
export interface SonioxConfig {
  ws_url: string;
  model: string;
  sample_rate: number;
  num_channels: number;
  audio_format: string;
  chunk_size: number;
  context_general?: SonioxContextGeneralEntry[];  // Domain/topic metadata
  context_text?: string;                          // Free-form context
  enable_endpoint_detection?: boolean;
  max_endpoint_delay_ms?: number;
  max_non_final_tokens_duration_ms?: number;
  language_hints?: string[];
  language_hints_strict?: boolean;
}

export interface SonioxContextGeneralEntry {
  key: string;
  value: string;
}

/* Runtime context passed to start() */
export interface SonioxContext {
  terms?: string[];  // Vocabulary terms for this session
}

/* Defaults provided by native bridge */
export interface VoiceToTextDefaults {
  terms: string[];
}
```

#### WebSocket Initialization (`/tmp/stt/ui/src/soniox-client.ts`)

When opening WebSocket, the first frame sends JSON init config:

```typescript
private openWebSocket(apiKey: string, context: SonioxContext): void {
  const config = this.config!;
  this.ws = new WebSocket(config.ws_url);

  this.ws.onopen = () => {
    // Build context payload (only include if present)
    const payloadContext = {
      ...(config.context_general?.length && {
        general: config.context_general,
      }),
      ...(config.context_text?.trim() && {
        text: config.context_text.trim(),
      }),
      ...(context.terms?.length && {
        terms: context.terms,
      }),
    };

    // First frame: JSON init
    const initFrame = {
      api_key: apiKey,
      model: config.model,
      sample_rate: config.sample_rate,
      num_channels: config.num_channels,
      audio_format: config.audio_format,
      enable_endpoint_detection: config.enable_endpoint_detection,
      max_endpoint_delay_ms: config.max_endpoint_delay_ms,
      max_non_final_tokens_duration_ms: config.max_non_final_tokens_duration_ms,
      language_hints: config.language_hints,
      language_hints_strict: config.language_hints_strict ?? false,
      ...(Object.keys(payloadContext).length > 0 && {
        context: payloadContext,  // Include context if non-empty
      }),
    };

    this.ws!.send(JSON.stringify(initFrame));
  };
}
```

**Key point:** `context.terms` is passed directly to Soniox via WebSocket as an array of strings.

### 2.3 Example Config (`/tmp/stt/config.json`)

```json
{
  "soniox": {
    "ws_url": "wss://stt-rt.soniox.com/transcribe-websocket",
    "model": "stt-rt-v4",
    "sample_rate": 16000,
    "num_channels": 1,
    "audio_format": "pcm_s16le",
    "chunk_size": 4096,

    "context_general": [
      { "key": "domain", "value": "desktop dictation" },
      { "key": "topic", "value": "voice commands and short text insertion" }
    ],
    "context_text": "The user speaks short dictation snippets, app names, and command-like phrases for macOS text insertion.",

    "enable_endpoint_detection": true,
    "max_endpoint_delay_ms": 500,
    "max_non_final_tokens_duration_ms": 1800,
    "language_hints": ["vi", "en"],
    "language_hints_strict": true
  }
}
```

**Context purposes:**
- `context_general`: Key-value metadata (domain, topic, use-case)
- `context_text`: Free-form instructions to Soniox about expected content
- `terms`: Dynamic vocabulary list sent at runtime per session

---

## 3. Color Scheme & Design Tokens

### 3.1 Accent Colors
- **Cyan (primary):** #38e8ff (listening state)
- **Violet (secondary):** #a78bfa (processing state)
- **Green (success):** #10b981
- **Red (error):** #ef4444
- **Orange (warning):** #f59e0b

### 3.2 Grayscale
- **Primary text:** #e6edf3
- **Secondary text:** #8b949e
- **Tertiary text:** #6e7681
- **Disabled:** #484f58
- **Bg dark:** #080a0e

### 3.3 Typography
- **Font:** -apple-system, BlinkMacSystemFont, "Segoe UI" (macOS system stack)
- **Mono:** ui-monospace, "SF Mono", Menlo (for code snippets)
- **Base size:** 14px
- **Small:** 12px
- **Extra small:** 11px

### 3.4 Spacing (8pt grid)
- 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px

### 3.5 Animations
- **Fast:** 120ms (hover/active)
- **Normal:** 200ms (state changes)
- **Slow:** 300ms (glow transitions)
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out)

---

## 4. Implementation Guidance

### 4.1 Bar Recreation Checklist
- [ ] 7 state-driven CSS classes via `data-state` attribute
- [ ] Glassmorphism background (78% opacity gradient) + 1px border
- [ ] Canvas waveform (56×28 CSS, DPR scaled): 12 bars, 2px width
- [ ] Idle waveform: gray bars, sinusoidal animation
- [ ] Active waveform: cyan→violet gradient, frequency-responsive
- [ ] Status dot (8×8px) with state-specific colors & animations
- [ ] Transcript area: final (14px bold), interim (12px italic gray), prompt (hidden until listening)
- [ ] State label: uppercase, 11px, state-driven colors
- [ ] Two action buttons (28×28px): clear (restart) & close (stop)
- [ ] Ambient glow layer (::before) with state-driven shadows
- [ ] Overlay mode toggle: PASSIVE (dim, click-through) vs INTERACTIVE (full buttons)

### 4.2 Vocabulary Integration
- [ ] Store terms in persistent storage (e.g., `VoiceToTextDefaults.terms`)
- [ ] Pass `SonioxContext { terms }` to Soniox on session start
- [ ] UI: Tag list + input + add button in settings dialog
- [ ] Reset button restores default terms
- [ ] Badge shows current term count
- [ ] Terms sent in first WebSocket frame: `{ context: { terms: [...] } }`

### 4.3 Design Notes
- **No backdrop-filter:** Caused flickering on WebKit first-show; use gradient opacity instead
- **Reduced motion:** Disable animations for `prefers-reduced-motion: reduce`
- **Device pixel ratio:** Canvas scaled by `window.devicePixelRatio`
- **RAF animation:** Waveform runs on requestAnimationFrame, stops when state ≠ LISTENING
- **ARIA:** Live region on transcript; aria-hidden on decorative elements

---

## 5. Key Files Reference

| File | Purpose |
|------|---------|
| `/tmp/stt/ui/bar.html` | Bar HTML structure & accessibility |
| `/tmp/stt/ui/bar.css` | Bar styling, animations, state transitions |
| `/tmp/stt/ui/src/bar.ts` | Bar lifecycle, waveform animation, state binding |
| `/tmp/stt/ui/src/bar-render.ts` | Pure render functions (testable) |
| `/tmp/stt/ui/src/bar-state-machine.ts` | State transition logic (7 states) |
| `/tmp/stt/ui/src/soniox-client.ts` | WebSocket init, context/terms payload |
| `/tmp/stt/ui/src/types.ts` | Type definitions (SonioxConfig, SonioxContext, etc.) |
| `/tmp/stt/ui/index.html` | Vocabulary dialog UI |
| `/tmp/stt/ui/src/tokens.css` | Design tokens (colors, spacing, fonts) |
| `/tmp/stt/config.json` | Example Soniox config with context |

---

## 6. Unresolved Questions

1. **Vocabulary defaults:** Where are default terms loaded from in dtateks/stt? (Not found in config.json—likely from native bridge)
2. **Persist storage:** Does vocabulary persist across sessions? (Likely yes, but mechanism not inspected)
3. **Terms limit:** Is there a max number of vocabulary terms Soniox accepts?
4. **Update behavior:** When user adds/removes terms, is there a reload or hot-update of the session?

