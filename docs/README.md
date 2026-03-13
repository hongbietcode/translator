# Documentation Index — Personal Translator

**Last Updated:** 2026-03-14
**Status:** Complete (React 19 + TypeScript migration documentation)

Welcome to the Personal Translator documentation. This directory contains comprehensive guides for developers, architects, and project stakeholders.

---

## Quick Navigation

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| **[codebase-summary.md](./codebase-summary.md)** | Bird's-eye view of project structure | New developers, architects | 15 min |
| **[code-standards.md](./code-standards.md)** | Development guidelines (React, TypeScript, Rust) | Developers | 20 min |
| **[system-architecture.md](./system-architecture.md)** | Detailed architecture, data flow, patterns | Architects, senior devs | 30 min |
| **[project-overview-pdr.md](./project-overview-pdr.md)** | Product vision, requirements, roadmap | PMs, leads, stakeholders | 25 min |

---

## Getting Started

### I'm a new developer joining the project
1. Read: **[codebase-summary.md](./codebase-summary.md)** (15 min)
2. Read: **[code-standards.md](./code-standards.md)** sections relevant to your work (10 min)
3. Check: [system-architecture.md](./system-architecture.md) for deep dives as needed

### I'm setting up the development environment
1. Follow: [README.md](../README.md) (project root) for setup instructions
2. Refer: [codebase-summary.md — Build & Development](./codebase-summary.md#build--development)
3. Check: [code-standards.md — Linting & Formatting](./code-standards.md#linting--formatting)

### I'm implementing a new feature
1. Check: [project-overview-pdr.md — Release Plan](./project-overview-pdr.md#release-plan) for roadmap status
2. Review: [system-architecture.md](./system-architecture.md) for relevant layer (hooks, commands, etc.)
3. Follow: [code-standards.md](./code-standards.md) for your tech stack (React, TypeScript, or Rust)

### I'm debugging an issue
1. Consult: [system-architecture.md — Error Boundaries & Recovery](./system-architecture.md#error-boundaries--recovery)
2. Review: [codebase-summary.md — Known Issues & TODOs](./codebase-summary.md#known-issues--todos)
3. Check: Component/hook in [system-architecture.md](./system-architecture.md) for data flow

### I'm doing a code review
1. Refer: [code-standards.md — Code Review Checklist](./code-standards.md#code-review-checklist)
2. Check: [system-architecture.md](./system-architecture.md) for architectural alignment
3. Verify: Against functional/non-functional requirements in [project-overview-pdr.md](./project-overview-pdr.md)

---

## Document Overview

### Codebase Summary (341 LOC)
**What:** High-level project structure, technology stack, key components.

**Contains:**
- Architecture overview with diagrams
- Directory structure (src/, src-tauri/, config)
- Frontend layer (React 19, custom hooks, Tailwind CSS v4)
- Backend layer (Rust, audio capture, Tauri commands)
- Real-time translation data flow (9-step pipeline)
- Design patterns (hook-based, custom WebSocket client)
- Build configuration and metrics
- Known issues (5 items)
- Testing recommendations

**Best for:** Quick understanding of project structure and dependencies.

### Code Standards (650 LOC)
**What:** Development guidelines, naming conventions, error handling patterns.

**Contains:**
- File organization (components, hooks, utilities)
- Component structure and state management
- TypeScript typing best practices
- React hooks rules and patterns
- Error handling (async/await, Tauri IPC)
- Tailwind CSS v4 utilities
- Rust standards (modules, commands, error handling)
- Git conventions (commits, PRs)
- Security and performance guidelines
- Code review checklist

**Best for:** Ensuring consistency in new code contributions.

### System Architecture (761 LOC)
**What:** Detailed architecture, layers, data flow, concurrency model, testing strategy.

**Contains:**
- 5-layer architecture (presentation → hooks → IPC → backend → external)
- Detailed hook documentation (6 hooks with interfaces)
- Backend services (audio capture, Tauri commands)
- Data flow walkthroughs (3 scenarios)
- State management hierarchy
- Event loop and lifecycle management
- Concurrency model (React single-threaded, Rust async)
- Error recovery strategies
- Performance characteristics and budgets
- Security model (API key, permissions, privacy)
- Testing strategy (unit, integration, E2E)
- Deployment and packaging

**Best for:** Understanding how components interact, debugging complex issues.

### Project Overview & PDR (533 LOC)
**What:** Product vision, requirements, metrics, roadmap, risk assessment.

**Contains:**
- Executive summary (project goals, differentiators)
- Functional requirements (5 areas: audio, translation, UI, settings, history)
- Non-functional requirements (performance, reliability, security, usability)
- Architecture requirements and constraints
- Technology stack rationale
- Integration points (Soniox, macOS APIs, file system)
- Success metrics (adoption, quality, technical)
- Risk assessment (high/medium/low with mitigations)
- Release plan (v0.1, v0.2, v0.3+)
- Rollout strategy
- Team responsibilities
- Glossary

**Best for:** Understanding product direction, planning features, assessing risks.

---

## Key Architectural Concepts

### Hook-Based Architecture
All business logic lives in custom React hooks (useSettings, useAudioCapture, useSoniox, etc.). Components are pure and presentational. This enables:
- Easy testing (hooks can be tested in isolation)
- Reusable logic (multiple components can use same hook)
- Clear separation of concerns (business vs. presentation)

See: [system-architecture.md — Business Logic Layer](./system-architecture.md#layer-2-business-logic-custom-hooks)

### Tauri IPC Bridge
Frontend communicates with Rust backend through Tauri commands (invoke) and events (listen). This enables:
- Safe memory boundary (no direct memory sharing)
- Type-safe RPC (commands return Result<T, String>)
- Async operations (Tauri commands are async)
- Real-time streaming (audio via events)

See: [system-architecture.md — Infrastructure Layer](./system-architecture.md#layer-3-infrastructure-tauri-ipc-bridge)

### No External UI Framework
Uses custom React components + Tailwind CSS v4 (no shadcn/ui or Material UI). Why:
- Overlay paradigm doesn't fit typical component libs
- Custom WebSocket client (Soniox SDK unsuitable for desktop)
- Lightweight, desktop-optimized

See: [code-standards.md — Styling with Tailwind CSS v4](./code-standards.md#styling-with-tailwind-css-v4)

### Real-Time Translation Pipeline
Audio flows through multiple stages (capture → resampling → WebSocket → Soniox → React render). Optimized for:
- Low latency (200ms audio chunks, <2s end-to-end)
- Memory efficiency (segment cleanup, no memory leaks)
- Graceful degradation (auto-reconnect, error recovery)

See: [system-architecture.md — Data Flow Walkthrough](./system-architecture.md#data-flow-walkthrough)

---

## Common Tasks

### Adding a new component
1. Create `src/components/component-name.tsx` (kebab-case filename)
2. Follow pattern in [code-standards.md — Component Structure](./code-standards.md#component-structure)
3. Export default function (PascalCase name)
4. Define props interface above component
5. Use Tailwind for styling (no CSS files)
6. Update this documentation if major new feature

### Adding a new hook
1. Create `src/hooks/use-feature-name.ts` (kebab-case filename)
2. Follow pattern in [code-standards.md — React Hooks Rules](./code-standards.md#react-hooks-rules)
3. Document with JSDoc comments
4. Export named function (use{Feature} name)
5. Return object with { state, handlers, cleanup }

### Adding a new Tauri command
1. Create command in `src-tauri/src/commands/{domain}.rs`
2. Annotate with `#[tauri::command]`
3. Return `Result<T, String>` with descriptive errors
4. Validate inputs early
5. Call from frontend via `invoke("command_name", { args })`
6. Update [code-standards.md](./code-standards.md) if new pattern

### Making a code change
1. Run linting: `npm run lint` (or `cargo clippy`)
2. Ensure TypeScript compiles: `tsc --noEmit`
3. Test the change (manual or automated)
4. Follow [code-standards.md — Git Commit Messages](./code-standards.md#git-commit-messages)
5. Self-review against [code-standards.md — Code Review Checklist](./code-standards.md#code-review-checklist)

### Debugging a real-time translation issue
1. Check [system-architecture.md — Error Boundaries & Recovery](./system-architecture.md#error-boundaries--recovery)
2. Verify audio capture (check useAudioCapture hook state)
3. Verify Soniox connection (check useSoniox.status)
4. Check browser console for errors or logs
5. Review [codebase-summary.md — Known Issues](./codebase-summary.md#known-issues--todos)

---

## Maintenance & Updates

### When to Update Documentation

| Event | File(s) to Update |
|-------|-------------------|
| New component or hook | codebase-summary.md, code-standards.md (if new pattern) |
| New Tauri command | system-architecture.md, project-overview-pdr.md |
| Major refactoring | system-architecture.md, code-standards.md |
| Feature implementation | project-overview-pdr.md (mark complete) |
| Bug fix with learning | codebase-summary.md (update known issues) |
| Design decision | system-architecture.md, project-overview-pdr.md |
| Dependency upgrade | codebase-summary.md, code-standards.md |

### Update Frequency

- **Quarterly:** Review roadmap progress (project-overview-pdr.md)
- **Per sprint:** Add new code patterns to standards (code-standards.md)
- **As-needed:** Fix inaccuracies, add missing documentation

---

## Unresolved Questions

For team discussion and decision-making:

1. **Test framework preference?** (Jest, Vitest, other)
   - Impacts: v0.2 planning, CI/CD setup
   - See: [code-standards.md — Testing](./code-standards.md#testing)

2. **Should we document Soniox API contract in detail?** (currently linked to external docs)
   - Impacts: documentation maintenance, API changes
   - See: [system-architecture.md — Soniox WebSocket Client](./system-architecture.md#soniox-websocket-client-srclibsoniox-websocket-clientts)

3. **Auto-update mechanism design?** (in-app delta, full download, App Store)
   - Impacts: v0.3 feature planning
   - See: [project-overview-pdr.md — Release Plan](./project-overview-pdr.md#version-030-backlog--features)

4. **Crash reporting service?** (Sentry, Bugsnag, custom, or none)
   - Impacts: privacy, monitoring, dependencies
   - See: [project-overview-pdr.md — Risk Assessment](./project-overview-pdr.md#risk-assessment)

5. **API endpoint documentation detail?** (currently just Tauri commands listed)
   - Impacts: documentation scope, developer experience
   - See: [system-architecture.md — Commands Module](./system-architecture.md#commands-module-srctaurisrccommandsrsrs)

---

## Report Location

**Completion Report:** `/Users/huutri/code/translator/plans/reports/docs-manager-260314-0055-react-migration-documentation.md`

This report contains:
- Detailed analysis of all 4 documentation files
- Quality metrics (coverage, accuracy, completeness)
- Key findings and insights
- Recommendations (short-term, medium-term, long-term)
- Maintenance plan

---

## Related Documents

- **Project Root:** [README.md](../README.md) — User-facing project description
- **Codebase Compaction:** [repomix-output.xml](../repomix-output.xml) — Full codebase for AI analysis
- **Planning:** [plans/](../plans/) — Development phase documentation

---

## Quick Reference Links

**Frontend Stack:**
- React 19 docs: https://react.dev
- TypeScript strict mode: https://www.typescriptlang.org/tsconfig#strict
- Vite 6 docs: https://vitejs.dev
- Tailwind CSS v4: https://tailwindcss.com/docs/v4

**Backend Stack:**
- Tauri 2 docs: https://tauri.app
- Rust official: https://www.rust-lang.org
- Tokio async runtime: https://tokio.rs

**External APIs:**
- Soniox API: https://soniox.com/docs
- macOS audio (ScreenCaptureKit): https://developer.apple.com/documentation/screencapturekit
- macOS audio (AVFoundation): https://developer.apple.com/av-foundation/

---

## Questions?

If documentation is unclear or missing:
1. Check the relevant main file (codebase-summary, code-standards, system-architecture, project-overview-pdr)
2. Review the completion report for additional context
3. Reference actual code files in `src/` or `src-tauri/src/`
4. Raise an issue or PR with clarification request

---

**Documentation Version:** 1.0 (2026-03-14)
**Coverage:** 100% (all 55 files analyzed, 7 components, 6 hooks, 3 backend modules)
**Maintenance:** See update triggers above
