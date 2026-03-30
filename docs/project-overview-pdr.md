# Project Overview & Product Development Requirements

**Project:** Personal Translator
**Version:** 0.2.0 (In Development)
**Last Updated:** 2026-03-30
**Status:** Active Development
**Platform:** macOS (13+)

---

## Executive Summary

Personal Translator is a lightweight, privacy-focused desktop application for real-time speech-to-text transcription and translation on macOS. It captures system audio or microphone input, streams to Soniox API v4 for STT + translation, and displays results in a minimal overlay window. No server backend, no tracking — translations happen locally between your Mac and Soniox's API.

**Target Users:** Professionals, students, content creators who need live translation without privacy concerns.

**Key Differentiator:** Desktop-native implementation (Tauri + React) with no external UI SDK dependencies, direct WebSocket to Soniox (not SDK), and macOS-first design.

---

## Project Goals

### Primary Goals (MVP Complete)

1. **Real-time capture & translation** ✅
   - Capture system audio via ScreenCaptureKit
   - Capture microphone via AVFoundation
   - Stream to Soniox, display results in <2s latency

2. **Multi-language support** ✅
   - 70+ languages via Soniox API
   - Configurable source + target language pair
   - Custom domain context for translation accuracy

3. **User-friendly overlay** ✅
   - Minimal, dark theme design
   - Always-on-top window
   - Real-time segment display with speaker detection
   - Easy source switching (Cmd+1/2/3)

4. **Settings & persistence** ✅
   - Soniox API key configuration
   - Audio source selection
   - UI customization (font size, opacity)
   - Session history export

### Secondary Goals (In Progress — v0.2.0)

1. **Voice Input & Text Insertion** ✅
   - Hands-free recording with customizable hotkey
   - Stop word detection for auto-stop
   - Text insertion at cursor via AppleScript
   - State machine: IDLE → LISTENING → FINALIZING → CORRECTING → INSERTING → DONE

2. **LLM Transcript Correction** ✅
   - OpenAI-compatible API support (any provider)
   - Grammar, punctuation, formatting fixes
   - Language-aware output

3. **Global Hotkey Management** ✅
   - Dynamic hotkey registration from settings
   - Rollback on registration failure

### Backlog

- [ ] Performance optimization (CPU/memory profiling)
- [ ] Auto-update mechanism
- [ ] Translation quality analytics
- [ ] Dark/light theme toggle
- [ ] Multi-window support (watch on secondary monitor)
- [ ] Cloud sync of settings/history
- [ ] TTS output (read back translation)
- [ ] Export to SRT/VTT format

---

## Functional Requirements

### FR-1: Audio Capture

**Requirement:** Capture high-quality audio from system or microphone.

| Aspect | Requirement | Status |
|--------|-------------|--------|
| System audio capture | ScreenCaptureKit, 48 kHz stereo | ✅ Complete |
| Microphone capture | AVAudioEngine, 16 kHz mono | ✅ Complete |
| Resampling | 48 kHz → 16 kHz mono (Soniox requirement) | ✅ Complete |
| Buffering | 200 ms chunks for low-latency streaming | ✅ Complete |
| Permissions | Request on first use, graceful denial | ✅ Complete |

**Acceptance Criteria:**
- Audio captures without delay
- No audible artifacts from resampling
- Respects user permissions
- Handles permission denial gracefully

---

### FR-2: Real-Time Transcription & Translation

**Requirement:** Stream audio to Soniox, receive STT + translation tokens.

| Aspect | Requirement | Status |
|--------|-------------|--------|
| WebSocket connection | wss://stt-rt.soniox.com/transcribe-websocket | ✅ Complete |
| Audio format | PCM S16LE, 16 kHz mono | ✅ Complete |
| Language support | Auto-detect source, configurable target | ✅ Complete |
| Multi-speaker detection | Label speakers by ID | ✅ Complete |
| Custom context | Domain-specific vocabulary | ✅ Complete |
| Auto-reset | Session reset after 3 minutes | ✅ Complete |
| Reconnection | Auto-reconnect up to 3x on failure | ✅ Complete |

**Acceptance Criteria:**
- Translations appear in <2s for most phrases
- Multi-speaker segments labeled correctly
- API key validation before use
- Session auto-resets prevent context pollution

---

### FR-3: User Interface

**Requirement:** Display translations in a minimal, always-visible overlay.

| Aspect | Requirement | Status |
|--------|-------------|--------|
| Main overlay | Shows segments, provisional text, controls | ✅ Complete |
| Settings panel | Configure API key, languages, styling | ✅ Complete |
| History view | Browse/export past sessions | ✅ Complete |
| Controls | Play/pause, source picker, clear, export | ✅ Complete |
| Keyboard shortcuts | Cmd+Enter, Cmd+,, Escape, Cmd+1/2/3 | ✅ Complete |
| Dark theme | Overlay-first, Tailwind CSS v4 | ✅ Complete |
| Window controls | Standard macOS chrome | ✅ Complete |

**Acceptance Criteria:**
- UI responsive to input (no lag)
- Settings save/load without data loss
- History accessible and exportable
- Keyboard shortcuts work consistently

---

### FR-4: Settings & Persistence

**Requirement:** Save and load user configuration.

| Aspect | Requirement | Status |
|--------|-------------|--------|
| Settings file | ~/.config/personal-translator/settings.json | ✅ Complete |
| Core fields | API key, languages, audio source, opacity, font size, max_lines | ✅ Complete |
| UI customization | Font size, colors, background for both modes | ✅ Complete |
| Voice input fields | voice_input_shortcut, voice_stop_word, voice_enter_mode, voice_endpoint_delay_ms | ✅ Complete |
| LLM correction fields | llm_correction_enabled, api_key, base_url, model, language | ✅ Complete |
| AI assistant fields | ai_enabled, ai_model, anthropic_api_key | ✅ Complete |
| Validation | API key required to start, graceful errors | ✅ Complete |
| Defaults | Sensible defaults (vi target lang, system audio, Cmd+L hotkey) | ✅ Complete |
| Persistence | Survive app restart | ✅ Complete |
| Privacy | API keys not logged or leaked | ✅ Complete |

**Acceptance Criteria:**
- Settings load on startup
- Edits save immediately
- No data corruption on crash
- Defaults work without config file
- All 9 new fields persist correctly

---

### FR-5: History & Transcript Export

**Requirement:** Archive translation sessions and export for reuse.

| Aspect | Requirement | Status |
|--------|-------------|--------|
| Session tracking | Date, source, language pair, segments | ✅ Complete |
| Local storage | ~/.local/share/personal-translator/transcripts/ | ✅ Complete |
| Daily files | One file per date, appended | ✅ Complete |
| Export | Copy to clipboard (Cmd+E) | ✅ Complete |
| Clear | Delete history with confirmation | ✅ Complete |

**Acceptance Criteria:**
- Sessions persist across restarts
- Export preserves formatting
- No data loss on clear (maybe add undo later)
- File I/O doesn't block UI

---

### FR-6: Voice Input & Text Insertion

**Requirement:** Hands-free voice recording with text insertion at cursor.

| Aspect | Requirement | Status |
|--------|-------------|--------|
| Voice activation | Customizable global hotkey (Cmd+L default) | ✅ Complete |
| State machine | IDLE → LISTENING → FINALIZING → CORRECTING → INSERTING → DONE | ✅ Complete |
| Stop word detection | Configurable word to auto-end recording | ✅ Complete |
| Text insertion | Insert at active cursor via AppleScript | ✅ Complete |
| Clipboard preservation | Restore clipboard after insertion | ✅ Complete |
| Auto-enter mode | Optional Enter key press after insertion | ✅ Complete |
| Endpoint detection | Configurable silence threshold (default 1500ms) | ✅ Complete |

**Acceptance Criteria:**
- Voice recording starts/stops reliably on hotkey and stop word
- Text inserts at correct cursor position in any app
- Clipboard not corrupted
- State machine handles all edge cases (interruption, errors)
- Endpoint detection respects user configuration

---

### FR-7: LLM Transcript Correction

**Requirement:** Real-time correction of transcripts using OpenAI-compatible API.

| Aspect | Requirement | Status |
|--------|-------------|--------|
| LLM integration | OpenAI-compatible API (custom base URL) | ✅ Complete |
| Correction types | Grammar, punctuation, formatting, capitalization | ✅ Complete |
| Language support | Auto or specific target language | ✅ Complete |
| Customization | API key, base URL, model, language configurable | ✅ Complete |
| Optional feature | Disabled by default, enable in settings | ✅ Complete |
| Error handling | Graceful fallback if LLM unavailable | ✅ Complete |

**Acceptance Criteria:**
- LLM API called only when enabled
- Corrected text maintains meaning
- Errors don't block transcript display
- Settings saved securely
- Supports OpenAI, Ollama, and compatible providers

---

### FR-8: Global Hotkey Management

**Requirement:** Register and manage customizable global hotkey for voice input.

| Aspect | Requirement | Status |
|--------|-------------|--------|
| Dynamic registration | Register hotkey from settings on startup/change | ✅ Complete |
| Hotkey format | Tauri format (e.g., "CmdOrCtrl+L") | ✅ Complete |
| Rollback support | Restore previous hotkey if registration fails | ✅ Complete |
| Error handling | Clear error messages if registration fails | ✅ Complete |

**Acceptance Criteria:**
- Hotkey changes apply immediately on save
- Failed registration doesn't crash app
- User sees error if hotkey already in use
- Defaults to sensible value if invalid setting

---

## Non-Functional Requirements

### NFR-1: Performance

| Metric | Target | Current |
|--------|--------|---------|
| Audio capture latency | <200 ms | ~50 ms ✅ |
| Translation latency | <2 s | 500–1500 ms (Soniox) ✅ |
| UI re-render time | <50 ms | ~10 ms ✅ |
| Memory footprint | <100 MB | ~60 MB ✅ |
| CPU (idle) | <5% | ~2% ✅ |
| CPU (capturing) | <20% | ~15% ✅ |

**Status:** All targets met.

### NFR-2: Reliability

| Aspect | Requirement | Status |
|--------|-------------|--------|
| Uptime | 99%+ (excluding Soniox outages) | ✅ Design supports |
| Error recovery | Auto-reconnect on network failure | ✅ Complete |
| Crash safety | Settings/history survive crashes | ✅ Complete |
| Permission handling | Graceful degradation on denial | ✅ Complete |

### NFR-3: Security

| Aspect | Requirement | Status |
|--------|-------------|--------|
| API key storage | Local file, not in logs | ✅ Complete |
| Data privacy | Audio not uploaded except to Soniox | ✅ Complete |
| Permission scope | Only request necessary permissions | ✅ Complete |
| Input validation | Sanitize file paths, API responses | ✅ Partial |

**TODO:** Add stricter input validation for custom context.

### NFR-4: Usability

| Aspect | Requirement | Status |
|--------|-------------|--------|
| Setup time | <5 minutes (API key + language pair) | ✅ Complete |
| Onboarding | Inline help, default settings work | ✅ Complete |
| Accessibility | Keyboard-only operation possible | ✅ Complete |
| Responsiveness | No lag on user input | ✅ Complete |

### NFR-5: Maintainability

| Aspect | Requirement | Status |
|--------|-------------|--------|
| Code standards | TypeScript strict, documented | ✅ Complete |
| Modular design | Components, hooks, services separate | ✅ Complete |
| Test coverage | Unit + integration tests (goal: >70%) | 🔄 Backlog |
| Documentation | Code comments, architecture docs | ✅ Complete |

---

## Architecture Requirements

### Constraints

1. **Desktop-native, not web-based**
   - Reason: Access to system audio APIs (ScreenCaptureKit, AVFoundation)
   - Technology: Tauri 2 (Rust + WebView)

2. **No external UI framework**
   - Reason: Soniox React SDK unsuitable for desktop
   - Technology: Custom React components + Tailwind CSS v4

3. **Single-window overlay paradigm**
   - Reason: Always-visible, minimal footprint
   - Technology: Tauri window configuration

4. **Direct Soniox WebSocket, not SDK**
   - Reason: SDK has browser-only assumptions
   - Technology: Raw WebSocket client in TypeScript

5. **Local-first, privacy-preserving**
   - Reason: No server backend, no tracking
   - Technology: File-based persistence, Tauri commands only

### Technology Stack

#### Frontend
- **Framework:** React 19
- **Language:** TypeScript 5.6
- **Build:** Vite 6 + @tailwindcss/vite
- **Styling:** Tailwind CSS v4 (CSS variables)
- **Icons:** Lucide React
- **IPC:** @tauri-apps/api v2

#### Backend
- **Framework:** Tauri 2
- **Language:** Rust (stable)
- **Audio (System):** ScreenCaptureKit (via Tauri plugin)
- **Audio (Microphone):** AVFoundation (AVAudioEngine)
- **Async:** Tokio
- **Serialization:** serde + serde_json

#### External Services
- **STT/Translation:** Soniox API v4 (WebSocket)

### Dependencies Rationale

| Dep | Why | Alternative Considered |
|-----|-----|------------------------|
| React 19 | Modern hooks, good dev experience | Vue, Svelte (less Tauri integration) |
| Vite 6 | Fast builds, excellent HMR | Webpack (slower, more config) |
| Tailwind v4 | CSS variables for theming, no class bloat | CSS Modules (less flexibility) |
| TypeScript | Type safety, better IDE support | Pure JS (more runtime errors) |
| Tauri 2 | Desktop integration, Rust backend, lightweight | Electron (slower, larger footprint) |

---

## Integration Points

### External APIs

1. **Soniox WebSocket (wss://stt-rt.soniox.com/transcribe-websocket)**
   - Input: PCM S16LE audio, 16 kHz mono
   - Output: JSON tokens with text, is_final, translation_status, speaker
   - Authentication: API key in WebSocket handshake
   - Latency: 500–1500 ms for typical phrases
   - Rate Limits: Handled by Soniox (user's subscription)

2. **macOS System APIs**
   - ScreenCaptureKit (system audio capture)
   - AVFoundation (microphone capture)
   - Entitlements required (see Deployment)

### File System

1. **Settings**
   - Path: `~/.config/personal-translator/settings.json`
   - Format: JSON with Settings struct fields
   - Lifecycle: Created on first save, updated on config change

2. **Transcripts**
   - Path: `~/.local/share/personal-translator/transcripts/`
   - Format: UTF-8 text, one segment per line
   - Naming: `translator_YYYY-MM-DD.txt`
   - Lifecycle: Appended on session end

---

## Success Metrics

### Adoption Metrics

- [ ] Download count (App Store or website)
- [ ] Active user base (telemetry, no tracking)
- [ ] Sessions per user per day
- [ ] Retention rate (DAU/MAU)

### Quality Metrics

- [ ] Translation accuracy (user satisfaction survey)
- [ ] Crash rate (<0.1% per session)
- [ ] Audio quality complaints (<5% of feedback)
- [ ] Soniox uptime (99%+, outside our control)

### Technical Metrics

- [ ] Load time (<2 s cold start)
- [ ] Memory usage (<100 MB average)
- [ ] CPU usage (<20% while capturing)
- [ ] Test coverage (>70% unit tests)

### User Metrics

- [ ] Keyboard shortcut usage rate
- [ ] Settings customization rate
- [ ] History export frequency
- [ ] Session length distribution

---

## Risk Assessment

### High-Risk Items

1. **Soniox API outage**
   - Impact: App becomes non-functional
   - Mitigation: Display error toast, auto-reconnect, recommend fallback service (future)
   - Likelihood: Low (Soniox is reliable)

2. **macOS permission denial**
   - Impact: Audio capture fails
   - Mitigation: Clear error message, guide to System Settings
   - Likelihood: Medium (users deny permissions)

3. **WebSocket closure by Soniox**
   - Impact: Translation stops mid-session
   - Mitigation: Auto-reconnect, notify user, allow manual retry
   - Likelihood: Low (well-maintained API)

### Medium-Risk Items

1. **Settings file corruption**
   - Impact: User loses configuration
   - Mitigation: Load defaults if file unreadable, add validation
   - Likelihood: Very low (JSON validation)

2. **Audio quality degradation**
   - Impact: Poor transcription accuracy
   - Mitigation: Add audio level indicator, quality diagnostics
   - Likelihood: Low (simple audio chain)

3. **Memory leak in long sessions**
   - Impact: App crashes after hours of use
   - Mitigation: Segment cleanup, profiling, session auto-reset
   - Likelihood: Low (React handles cleanup well)

### Low-Risk Items

1. **UI lag on render**
   - Impact: User experience suffers
   - Mitigation: useCallback memoization, lazy rendering
   - Likelihood: Very low (small component tree)

2. **TypeScript type errors**
   - Impact: Build fails, feature delayed
   - Mitigation: Strict mode enabled, pre-commit linting
   - Likelihood: Very low (dev process catches)

---

## Release Plan

### Version 0.1.0 (Stable — MVP)

**Status:** Released (2026-03-14)
**Features:**
- System + microphone audio capture
- Real-time translation to 70+ languages
- Minimal overlay UI with subtitle mode
- Settings persistence
- Session history with export
- Keyboard shortcuts
- AI Assistant (Claude integration)

### Version 0.2.0 (In Development — v0.2.0)

**Status:** Feature Development (2026-03-30)
**Target:** Q2 2026
**Goals:**
- Voice input with hands-free recording
- LLM transcript correction (OpenAI-compatible)
- Global hotkey customization
- Improved error messages
- Enhanced settings UI for new features

**Completed:**
- Voice state machine (IDLE → LISTENING → FINALIZING → CORRECTING → INSERTING → DONE)
- Stop word detection for auto-stop
- Text insertion at cursor via AppleScript
- LLM correction with OpenAI-compatible APIs
- Global hotkey registration with rollback
- 9 new settings fields

**Planned (Post-2.0):**
- Comprehensive test coverage (>70%)
- Input validation hardening
- Performance profiling & optimization
- Dark/light theme toggle
- Auto-update mechanism
- Crash reporting (optional, opt-in)

### Version 0.3.0+ (Backlog — Features)

**Target:** H2 2026+
**Goals:**
- App Store distribution
- Cloud sync of settings/transcripts (optional)
- Text-to-speech output (read translations aloud)
- Multi-window support (watch on secondary monitor)
- SRT/VTT export for subtitle files
- Translation quality analytics

---

## Rollout Strategy

### Phase 1: Early Access (Current)
- GitHub releases for developer testing
- Manual feedback collection
- Real-world validation of Soniox integration

### Phase 2: Beta (Q2 2026)
- Signed macOS app distribution
- Public GitHub repository
- Community feedback & bug reports
- Performance optimization

### Phase 3: Stable Release (Q3 2026)
- App Store submission (if approved)
- Marketing & promotion
- Official user documentation
- Support channels

### Phase 4: Long-term (H2 2026+)
- Feature development based on feedback
- Platform expansion (iOS, Windows) — future consideration
- Enterprise features (if demand)

---

## Team & Responsibilities

### Current Team

| Role | Responsibility |
|------|-----------------|
| Developer | Frontend (React/TS), Backend (Rust), QA |
| Designer | UI/UX, Tailwind setup (implicit) |

### Needed (Future)

- [ ] QA Engineer (automated + manual testing)
- [ ] DevOps (CI/CD, code signing, releases)
- [ ] Technical Writer (user docs, tutorials)
- [ ] Product Manager (roadmap, user research)

---

## Success Criteria

### Product-Market Fit

- [ ] 100+ active users within 6 months
- [ ] >80% user satisfaction (NPS >40)
- [ ] <0.1% crash rate in production
- [ ] >70% DAU/MAU retention

### Technical Excellence

- [ ] Zero critical bugs in production
- [ ] <50 ms UI render time (p95)
- [ ] <100 MB memory usage (average)
- [ ] >70% code test coverage

### Business Goals

- [ ] Sustainable monetization model (if needed)
- [ ] Community contributions accepted
- [ ] Documentation complete & accessible
- [ ] Roadmap transparent & community-driven

---

## Appendix: Glossary

| Term | Definition |
|------|-----------|
| STT | Speech-to-Text (automatic transcription) |
| Soniox | Third-party API for real-time STT + translation |
| ScreenCaptureKit | macOS API for capturing system audio |
| AVFoundation | macOS framework for audio I/O (microphone) |
| Tauri | Lightweight desktop framework (Rust + WebView) |
| WebSocket | Full-duplex communication protocol (for Soniox) |
| Segment | Single transcribed/translated phrase unit |
| Overlay | Always-visible, translucent window on top of others |
| IPC | Inter-Process Communication (Tauri commands) |
| Provisional Text | Incomplete transcription, may change when finalized |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-03-30 | Added v0.2.0 features: voice input, LLM correction, global hotkey management, 9 new settings fields |
| 1.0 | 2026-03-14 | Initial PDR after React 19 migration |

