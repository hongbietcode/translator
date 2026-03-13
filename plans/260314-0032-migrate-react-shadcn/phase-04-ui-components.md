# Phase 4: Build UI Components with shadcn/ui

## Priority: High | Status: Complete

## Overview

Rebuild all 3 views (overlay, settings, history) as React components using shadcn/ui + Tailwind CSS. Preserve exact same UX/layout.

## Steps

### Shared Components

1. **`src/components/titlebar.tsx`** — custom draggable titlebar
   - Status dot + text (disconnected/connecting/connected/error)
   - Source selector, Start/Stop button, History/Settings/Clear/Close icon buttons
   - Use `data-tauri-drag-region` for drag areas
   - shadcn/ui: `Button` variants for icon buttons

2. **`src/components/source-selector.tsx`** — audio source dropdown
   - shadcn/ui: `DropdownMenu` with system audio + mic device list
   - Calls `useInputDevices()` to list mics
   - Shows active source with checkmark

3. **`src/components/toast-provider.tsx`** — toast notifications
   - Use shadcn/ui `Sonner` or simple custom toast (match current: success/error/info)

### Overlay View

4. **`src/components/overlay-view.tsx`** — main view
   - Titlebar + TranscriptDisplay + resize handle
   - Consumes `useSoniox` transcript state

5. **`src/components/transcript-display.tsx`** — transcript rendering
   - Port `TranscriptUI` class logic as React component
   - Segments with speaker labels, translated text, provisional text, cursor blink
   - Placeholder state ("Press Start to begin translating")
   - Listening indicator (animated waves)
   - shadcn/ui: `ScrollArea` for transcript container
   - Auto-scroll to bottom on new content

### Settings View

6. **`src/components/settings-view.tsx`** — settings form
   - API key input (password toggle) — shadcn/ui `Input`
   - Source/target language selects — shadcn/ui `Select`
   - Audio source radio — shadcn/ui `RadioGroup`
   - Opacity/font size/max lines radio groups — shadcn/ui `RadioGroup`
   - Show original checkbox — shadcn/ui `Switch`
   - Context domain/terms inputs — shadcn/ui `Input`
   - Save button — shadcn/ui `Button`
   - Consumes `useSettings`

### History View

7. **`src/components/history-view.tsx`** — history panel
   - Session list with date, time, language pair, entries
   - Export button (copy to clipboard)
   - Clear all button (danger variant)
   - Empty state
   - shadcn/ui: `ScrollArea`, `Button`
   - Consumes `useHistory`

### Styling

8. **`src/styles/globals.css`**
   - Tailwind imports
   - CSS variables matching current design (light mode, macOS-native feel)
   - Custom animations: pulse, wave, blink, fadeInUp, viewIn
   - Scrollbar styling
   - `data-tauri-drag-region` user-select/pointer rules

## Design Notes

- Keep the **same visual design** — light mode, macOS-native, Inter font
- Window config unchanged: 600x400, transparent, no decorations, always-on-top
- Same keyboard shortcuts: ⌘Enter, ⌘,, Esc, ⌘H, ⌘1/2/3

## Success Criteria

- [ ] All 3 views render correctly
- [ ] Keyboard shortcuts work
- [ ] Drag region works for window moving
- [ ] Responsive within 400-800px width range
- [ ] Visual parity with current design

## Related Files

- `src/components/overlay-view.tsx` — new
- `src/components/settings-view.tsx` — new
- `src/components/history-view.tsx` — new
- `src/components/titlebar.tsx` — new
- `src/components/source-selector.tsx` — new
- `src/components/transcript-display.tsx` — new
- `src/styles/globals.css` — new
