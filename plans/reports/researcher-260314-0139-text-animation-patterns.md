# Text Animation Patterns for Real-Time Translation/Transcription

Date: 2026-03-14
Context: `/Users/huutri/code/translator` — Tauri app using React, CSS modules in `src/styles/components.css`, existing `transcript-display.tsx`

---

## How Production Apps Handle Streaming Text

**Google Translate / macOS Dictation**: Words appear instantly with no animation — raw speed is the UX. No fade, no slide. Provisional (in-progress) text shown in muted color, finalized text in full color.

**Otter.ai**: Words pop in with a very subtle opacity flash (~80ms). Finalized words transition from gray to white. No stagger — individual words animate on append, not the entire block.

**DeepL**: Translation appears word-by-word as source text is typed. Each new word fades in from `opacity:0` to `1` over ~150ms. No transform involved.

**Key insight**: Polished apps use **per-token/per-word** animation on the newly appended token only. They never re-animate already-rendered text. The provisional text zone is separate from finalized text.

---

## Top 3 Approaches (with Code)

### Approach 1: CSS `@keyframes` token-fade (no JS library, zero deps)

Best match for this codebase. Pure CSS + minimal React. Each new word/token gets a class that triggers a one-shot animation.

**How it works**: wrap each word in `<span class="word-in">` when it's newly appended. CSS does the rest.

```css
/* In components.css */
@keyframes word-in {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.word-token {
  display: inline;
  /* no will-change here — only set on newly animating elements */
}

.word-token--new {
  display: inline-block; /* needed for transform to work on inline */
  animation: word-in 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  will-change: opacity, transform;
}
```

```tsx
// In transcript-display.tsx — provisional text rendered word-by-word
function ProvisionalWords({ text }: { text: string }) {
  const words = text.split(" ").filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <span key={`${i}-${word}`} className="word-token word-token--new">
          {word}{" "}
        </span>
      ))}
    </>
  );
}
```

**Tradeoff**: key-based re-render on every new word is fine for short segments. For very long transcripts, use `useMemo` to only wrap the delta (new words since last render).

---

### Approach 2: Finalized segment fade-in (segment-level, not word-level)

When a provisional segment becomes finalized (status changes to `"translated"`), animate the whole segment block in. This is what the current code should do but doesn't.

```css
@keyframes segment-appear {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.text-translated {
  color: var(--color-foreground);
  display: inline;
  animation: segment-appear 250ms ease-out both;
  will-change: opacity, transform;
}
```

No JS changes needed — the existing `<span className="text-translated">` already gets this for free since it's newly mounted each time a segment is appended.

**This is the lowest-effort, highest-impact change for the existing codebase.**

---

### Approach 3: Provisional → Finalized color transition (no animation library)

This mimics Otter.ai's approach: provisional text is dim/italic (already done), and when it finalizes it cross-fades to full color. No layout changes, pure opacity/color transition.

```css
/* Provisional: muted, italic — existing */
.text-provisional {
  color: var(--color-muted-foreground);
  font-style: italic;
  transition: color 200ms ease, opacity 200ms ease;
}

/* Finalized: animate in fresh */
.text-translated {
  color: var(--color-foreground);
  animation: segment-appear 220ms ease-out both;
}

/* Cursor: already exists in codebase */
.cursor-blink {
  color: var(--color-accent);
  animation: blink 1s step-end infinite;
}
```

For the "snap from provisional to translated" moment, the key insight is that React unmounts `.text-provisional` and mounts `.text-translated` — the mount animation on `.text-translated` IS the transition. No extra state needed.

---

## Performance Rules for Streaming Text

| Rule | Why |
|------|-----|
| Only animate `opacity` + `transform` | GPU composited, no layout reflow |
| `will-change: opacity, transform` only on animating elements | Over-use wastes GPU layers |
| Never animate `width`, `height`, `top`, `left` | Forces reflow every frame |
| `display: inline-block` on word spans | Required for `transform` to apply to inline elements |
| Remove `will-change` after animation via `animationend` | Frees compositor layer |
| Use `animation: ... forwards` or `both` | Prevents flash-back to initial state |
| Keep `animation-duration` 150–250ms for word-level | Faster feels snappier, >300ms feels laggy for streaming |

**Auto-scroll consideration**: The existing `scrollTop = scrollHeight` on every segment/provisional update is fine. Do NOT animate scroll (smooth scroll) during active streaming — it causes jank when new content races against scroll inertia.

---

## Recommended Implementation for This App

**Minimal diff, maximum polish:**

1. Add `segment-appear` keyframe to `globals.css` or `components.css`
2. `.text-translated` already has the right class — it will animate on mount automatically
3. For provisional text: optionally wrap words in `<span class="word-token--new">` using `ProvisionalWords` component above
4. Skip Framer Motion / external libs — pure CSS handles this perfectly at this scale

**Files to modify:**
- `/Users/huutri/code/translator/src/styles/components.css` — add keyframes + update `.text-translated`
- `/Users/huutri/code/translator/src/components/transcript-display.tsx` — optionally add `ProvisionalWords` component

---

## Unresolved Questions

1. Are words tokenized by the Soniox API individually (token-streaming), or do provisional segments arrive as full phrases? If phrase-level, word-splitting the provisional text may misalign with actual word boundaries mid-update.
2. Does the overlay view (`overlay-view.tsx`) share the same `TranscriptDisplay` component? If not, animations need to be applied there too.
3. Is there a performance concern with many `will-change` spans during long sessions (100+ segments)? Should `will-change` be removed via `animationend` listener?
