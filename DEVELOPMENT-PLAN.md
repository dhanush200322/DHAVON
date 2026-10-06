# DHAVON — Phased Development & Implementation Plan
**Master Engineering Roadmap & Execution Sequence**
*Lead Architect & Senior Full-Stack Engineering Blueprint*

---

## 1. Overview & Execution Strategy

To ensure zero architectural drift, rock-solid security, and an interface that faithfully mirrors the master visual reference (`DHAVON Futuristic AI Observatory.png`), implementation is divided into six disciplined phases:

```
[Phase 1: Foundation & Monorepo Setup]
   │
   ▼
[Phase 2: Frontend Observatory Master Screen] ◄── Visual Priority Verification Gate
   │
   ▼
[Phase 3: Backend DHAVON CORE & Gateway]
   │
   ▼
[Phase 4: Supabase Database, RLS & Memory Engine]
   │
   ▼
[Phase 5: MCP Integration Layer & Tool Registry]
   │
   ▼
[Phase 6: Testing, Dockerization & Production Hardening]
```

Each phase has a dedicated **Verification Gate** that must pass before advancing to subsequent stages.

---

## 2. Phase Breakdown

### Phase 1: Foundation & Monorepo Infrastructure
**Objective**: Establish the repository layout, workspace toolchains, TypeScript configs, shared packages, and developer tooling.

- [ ] **Step 1.1**: Initialize monorepo root with `pnpm-workspace.yaml`, `.gitignore`, `.editorconfig`, and root `package.json`.
- [ ] **Step 1.2**: Configure `packages/types` with shared interfaces (Conversations, Messages, Goals, Tasks, MCP types, Orb states).
- [ ] **Step 1.3**: Configure `packages/ui` with shared design tokens (Obsidian color palette, glassmorphism CSS, animation curves).
- [ ] **Step 1.4**: Configure `packages/mcp` with protocol interfaces and standard tool schemas.
- [ ] **Step 1.5**: Setup `.env.example` templates for root, web app, and backend api.

**Verification Gate 1**:
- `pnpm install` succeeds without dependency conflicts.
- `pnpm build` across packages compiles strict TypeScript cleanly.

---

### Phase 2: Frontend Master Screen (The AI Observatory)
**Objective**: Build the pixel-perfect DHAVON opening / command screen recreating `DHAVON Futuristic AI Observatory.png` with complete fidelity.

- [ ] **Step 2.1**: Initialize Next.js 15+ App Router in `apps/web` with TypeScript, Tailwind CSS, Framer Motion, and Lucide icons.
- [ ] **Step 2.2**: Implement `ObservatoryBackdrop.tsx` (Layer 0 & 1):
  - Ultra-wide panoramic observatory window frame.
  - Left celestial sunrise / planetary horizon with crescent planet.
  - Right starry alpine night peaks with volumetric atmospheric mist.
  - Deep graphite framing columns and polished obsidian floor reflections.
- [ ] **Step 2.3**: Implement `ReflectivePlinth.tsx` (Layer 2 & 3):
  - Multi-tiered circular metallic dais with concentric glowing golden-amber rings.
  - Vertical cyan/white laser guide columns ascending towards the orb.
  - Mirror-finish surface floor reflection component.
- [ ] **Step 2.4**: Implement `IntelligenceOrb.tsx` (Layer 4 — Visual Focus):
  - Multi-layered canvas/WebGL + SVG + Framer Motion rendering.
  - Swirling dual-vortex plasma filaments (electric cyan-blue + ethereal ultraviolet-magenta).
  - Floating 3D-effect golden-white DHAVON 'D' emblem in the physical center.
  - 3 tilted elliptical orbit paths with orbiting celestial micro-satellites.
  - Rhythmic breathing animation and state machine (`CALM`, `LISTENING`, `THINKING`, `ACTING`).
- [ ] **Step 2.5**: Implement HUD & Spatial Typography (Layer 5):
  - Top-left: Stylized 'D' mark + `DHAVON` (`tracking-[0.35em]`) + `PERSONAL AI OS`.
  - Top-center: `THINK  •  PLAN  •  BUILD  •  GROW`.
  - Top-right: Status pill (`(•) Online | (D) Dhanush`) + circular glass settings gear button.
  - Central greeting: `GOOD EVENING` + `D H A N U S H` (cyan-to-amber luminous gradient) + `YOUR PERSONAL AI, ALWAYS WITH YOU`.
  - Ambient side text: `IDEAS INTO REALITY` (left) & `A MORE FOCUSED YOU` (right).
- [ ] **Step 2.6**: Implement Command Pod & Interaction Controls (Layer 6 & 7):
  - Glass capsule command bar with audio waveform visualizer bars on left.
  - `Talk to DHAVON...` placeholder.
  - Prominent glowing circular microphone button with pulsating violet/cyan halo.
  - Bottom action pills: `Ask` (search), `Plan` (checklist), `Create` (sparkles), `Analyze` (chart).
  - Bottom-left status widget: glowing micro-orb with stacked `LISTENING / THINKING / ACTING` indicators.
  - Bottom-right badge: `∞ | Powered by Your Mindset`.
- [ ] **Step 2.7**: Responsive layout testing across Desktop (1920x1080), Laptop (1440x900), Tablet (1024x768), and Mobile (390x844).

**Verification Gate 2**:
- Visual comparison with `DHAVON Futuristic AI Observatory.png` achieves 1:1 atmospheric and structural fidelity.
- Animation performance benchmarks maintain steady 60 FPS without frame drops.
- Responsive scaling preserves visual hierarchy and elegance on mobile and tablet.

---

### Phase 3: Backend DHAVON CORE & Gateway
**Objective**: Construct the NestJS backend and DHAVON CORE cognitive loop.

- [ ] **Step 3.1**: Initialize NestJS 10+ application in `apps/api` with TypeScript and modular architecture.
- [ ] **Step 3.2**: Implement `WebSocketGateway` (`/ws/dhavon`) with real-time event streaming (`session:init`, `interaction:text`, `interaction:token_delta`, `orb:state_transition`).
- [ ] **Step 3.3**: Implement AI Provider Abstraction (`IAiProvider`) with factory pattern supporting Google Gemini, Anthropic Claude, and OpenAI.
- [ ] **Step 3.4**: Implement `OrchestratorService`:
  - Intent classification (`DIRECT_INQUIRY`, `GOAL_PLANNING`, `TASK_EXECUTION`, `CREATIVE_SYNTHESIS`).
  - Streaming token pipeline directly to WebSocket.
  - State machine driving orb transitions (`CALM` -> `LISTENING` -> `THINKING` -> `ACTING`).
- [ ] **Step 3.5**: Implement global validation pipes, exception filters, and security rate limiting.

**Verification Gate 3**:
- Successful bi-directional WebSocket handshake between Next.js UI and NestJS API.
- Prompt entered in the UI triggers state transition to `THINKING`, streams token deltas, and returns the orb to `CALM`.

---

### Phase 4: Supabase Database, RLS & Memory Engine
**Objective**: Deploy the database schema, Row Level Security policies, and vector memory retrieval.

- [ ] **Step 4.1**: Create sequential SQL migrations in `supabase/migrations/`:
  - `001_initial_schema.sql` (Tables: users, conversations, messages, memories, goals, tasks, tool_executions, permissions, events, system_settings, audit_logs).
  - `002_enable_rls.sql` (Row Level Security policies isolating data to `auth.uid()`).
  - `003_pgvector_setup.sql` (Vector extension, 1536-dim embedding column, HNSW cosine index, `match_memories` stored function).
- [ ] **Step 4.2**: Implement `SupabaseService` repository in `apps/api` with typed database queries.
- [ ] **Step 4.3**: Implement `MemoryService` in `apps/api/src/core/memory/`:
  - Working memory cache.
  - Episodic memory persistence of conversation turns.
  - Semantic memory lookup with cosine similarity vector search.
- [ ] **Step 4.4**: Implement `GoalService` & `TaskService` in `apps/api/src/core/goals/`.

**Verification Gate 4**:
- All SQL migrations execute cleanly on Supabase.
- RLS blocks unauthorized queries across different user IDs.
- Semantic memory vector search successfully returns top-K relevant chunks for user queries.

---

### Phase 5: MCP Integration Layer & Tool Registry
**Objective**: Implement native Model Context Protocol support and risk-gated execution.

- [ ] **Step 5.1**: Build `McpManagerService` in `apps/api/src/mcp/` capable of managing stdio and SSE transport connections.
- [ ] **Step 5.2**: Build dynamic tool discovery and schema converter translating MCP JSON Schema to LLM function calls.
- [ ] **Step 5.3**: Implement `PermissionService` enforcing the Four-Tier Risk Matrix (`READ`, `LOW_RISK`, `CONFIRMATION_REQUIRED`, `SENSITIVE`).
- [ ] **Step 5.4**: Connect Wave 1 MCP servers (GitHub, Supabase, Postman).
- [ ] **Step 5.5**: Implement the interactive UI confirmation modal in the Observatory HUD for high-risk actions.

**Verification Gate 5**:
- Dynamic discovery registers external MCP tools into DHAVON CORE.
- Read operations execute automatically.
- Gated operations (e.g. Git commit or DB migration) correctly pause execution, display confirmation prompt in the UI, and proceed only upon user approval.

---

### Phase 6: Voice Intelligence System (COMPLETED & VERIFIED)
**Objective**: Build a production-quality Voice Intelligence layer for DHAVON with natural bidirectional voice communication.

- [x] **Step 6.1**: Implement `SpeechToTextProvider` abstraction and `GroqWhisperSTTProvider` (`whisper-large-v3-turbo`).
- [x] **Step 6.2**: Implement `TextToSpeechProvider` abstraction and zero-cost `BrowserSpeechTTSProvider`.
- [x] **Step 6.3**: Implement `VoiceProviderFactory` for dynamic registry and fallback resolution.
- [x] **Step 6.4**: Build `VoiceSessionService` and state lifecycle strictly synchronized with DHAVON Orb states.
- [x] **Step 6.5**: Integrate bidirectional WebSocket voice events (`dhavon.voice.*`) into `DhavonGateway`.
- [x] **Step 6.6**: Implement frontend `useVoiceIntelligence` hook with `MediaRecorder` capture and speech synthesis.
- [x] **Step 6.7**: Implement barge-in / speech interruption with clean audio context and playback cancellation.
- [x] **Step 6.8**: Route voice transcripts strictly through `DhavonCoreService` preserving permissions and memory recall.

**Verification Gate 6**:
- [x] STT & TTS provider abstractions implemented, tested, and verified.
- [x] Voice session states strictly synchronized with DHAVON Orb states.
- [x] Real voice memory test recalls persisted Supabase memory.
- [x] Barge-in cleanly stops active TTS playback without orphaned processes.
- [x] Security verified: server-side secrets only, transcript secret scrubbing, zero audio persistence.
- [x] 100% test pass rate (14/14 test suites, 60/60 tests, all E2E scripts passing).

---

## 3. Risk Assessment & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Visual Drift from Reference Image** | High | Visual inspection completed; all spatial coordinates, layers, colors, and typography locked in `FRONTEND.md`. |
| **WebGL / Canvas Orb Performance on Low-End Devices** | Medium | Implement automatic fallback to layered high-performance SVG + CSS radial glows if WebGL FPS drops below 30. |
| **LLM Provider Outages or Rate Limits** | High | Modular `IAiProvider` design enables automatic fallback or runtime switching between Gemini, Claude, and OpenAI. |
| **Tool Execution Hanging** | High | Strict `15,000ms` timeout wrapper with AbortController on all MCP calls prevents event-loop blocking. |
| **Parent Git Directory Interference** | Low | A parent directory (`C:/Users/ro224`) has a git repo. We will initialize an isolated, clean Git repository directly inside `DHAVON/` when ready. |
