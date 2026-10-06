# DHAVON — Backend Architecture & Engine Specification
**DHAVON CORE**: The Cognitive Engine of the Personal AI OS
*NestJS 10+, TypeScript, WebSocket Gateway, REST API, Provider Abstraction*

---

## 1. Architectural Philosophy

DHAVON's backend is not an arbitrary collection of CRUD controllers. It is organized as **DHAVON CORE** — a unified, event-driven cognitive engine capable of autonomous task execution, episodic recall, goal decomposition, and safe tool operation.

### High-Level Component Flow

```
                      +-----------------------------+
                      |         DHAVON UI           |
                      +-----------------------------+
                         │                       │
                (WebSocket Stream)          (REST API)
                         │                       │
                         ▼                       ▼
            +-----------------------------------------------+
            |               NestJS Gateway                  |
            |     AuthGuard • Validation • RateLimit        |
            +-----------------------------------------------+
                                 │
                                 ▼
+───────────────────────────────────────────────────────────────────────────+
│                               DHAVON CORE                                 │
│                                                                           │
│   +───────────────────────────────────────────────────────────────────+   │
│   │                         AI Orchestrator                           │   │
│   │        Context Synthesis • ReAct Loop • State Transition          │   │
│   +───────────────────────────────────────────────────────────────────+   │
│         │               │                 │                 │             │
│         ▼               ▼                 ▼                 ▼             │
│   +───────────+   +───────────+     +───────────+     +───────────+       │
│   │  Goal &   │   │  Memory   │     │Permission │     │   Tool    │       │
│   │Task Engine│   │  Engine   │     │  Engine   │     │ Registry  │       │
│   +───────────+   +───────────+     +───────────+     +───────────+       │
│         │               │                 │                 │             │
│         │               │                 │                 ▼             │
│         │               │                 │           +───────────+       │
│         │               │                 │           │    MCP    │       │
│         │               │                 │           │  Manager  │       │
│         │               │                 │           +───────────+       │
│         ▼               ▼                 ▼                 ▼             │
│   +───────────────────────────────────────────────────────────────────+   │
│   │             Event Stream & Immutable Audit Ledger                 │   │
│   +───────────────────────────────────────────────────────────────────+   │
+──────────────────────────────────┬────────────────────────────────────────+
                                   │
                                   ▼
             +─────────────────────────────────────────────+
             |   Supabase PostgreSQL & External Services   |
             +─────────────────────────────────────────────+
```

---

## 2. DHAVON CORE Subsystems

### 2.1 AI Orchestrator (`core/orchestrator`)
The central coordinator that drives the cognitive loop:
- **Intent Classifier**: Categorizes user requests into:
  - `DIRECT_INQUIRY` (quick contextual answer)
  - `GOAL_PLANNING` (multi-step objective formulation)
  - `TASK_EXECUTION` (immediate tool-assisted action)
  - `CREATIVE_SYNTHESIS` (drafting, ideation, architecture)
  - `SYSTEM_OPERATION` (preferences, status, memory management)
- **Cognitive Loop (ReAct / Plan-and-Solve)**:
  1. Receive prompt + session state.
  2. Retrieve semantic context from Memory Engine.
  3. Query Tool Registry for pertinent tools.
  4. Prompt AI Provider with structured schemas.
  5. Process AI tool invocation requests.
  6. Pass through Permission Engine for validation/confirmation.
  7. Execute via MCP or native handler.
  8. Stream delta tokens to client WebSocket in real time.
- **Provider Abstraction (`providers/`)**:
  - Defines the interface `IAiProvider`:
    ```typescript
    export interface IAiProvider {
      readonly name: string;
      chatStream(
        messages: ChatMessage[],
        tools: ToolDefinition[],
        options?: GenerationOptions
      ): AsyncIterable<ChatDelta>;
      generateEmbedding(text: string): Promise<number[]>;
    }
    ```
  - Implementations: `GeminiProvider`, `AnthropicProvider`, `OpenAiProvider`, `OllamaProvider`.
  - Configurable via `AI_DEFAULT_PROVIDER` in environment variables without altering core logic.

### 2.2 Goal & Task Engine (`core/goals`)
Maintains the user's high-level objectives and decomposes them into executable tasks:
- **Goal Entity**: Represents long-term outcomes (e.g., "Prepare Product Launch", "Learn Rust Programming").
- **Task Entity**: Atomic, executable unit with defined prerequisites, assigned tool, state (`PENDING`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `FAILED`), and retry policies.
- **Dependency Graph**: Enforces topological ordering of tasks before execution.

### 2.3 Memory Engine (`core/memory`)
A tri-layer memory architecture giving DHAVON long-term cognitive continuity:
1. **Working Memory**: Fast, ephemeral session cache maintained in Redis/memory holding current conversational turns and active goal context.
2. **Episodic Memory**: Detailed records of past conversations, decisions, and system interactions with temporal indexing.
3. **Semantic Memory**: Knowledge base of user preferences, facts, and persistent entities vectorized using `pgvector` (HNSW indexing with cosine similarity distance).

### 2.4 Permission & Safety Engine (`core/permissions`)
Enforces strict security boundaries to prevent unauthorized or destructive agent actions:

| Risk Level | Policy | Examples | Workflow |
| :--- | :--- | :--- | :--- |
| **`READ`** | Auto-approve | Reading calendar, searching code, querying memory | Direct execution, lightweight telemetry |
| **`LOW_RISK`** | Auto-approve with Audit | Creating tasks, saving draft notes, updating preferences | Direct execution, logged in `tool_executions` |
| **`CONFIRMATION_REQUIRED`** | Interactive Human Gate | Committing Git code, creating PR, sending emails, writing DB rows | Execution pauses, UI displays exact diff & arguments; resumes on user approval |
| **`SENSITIVE`** | Multi-step Authorization | Deleting data, deploying infrastructure, accessing API tokens | Requires explicit modal consent + credential re-auth |

### 2.5 Tool Registry & Sandboxing (`core/tools`)
- Manages native tools and dynamically discovered MCP tools.
- Validates all invocation payloads against strict Zod schemas before running.
- Wraps all execution in isolated execution sandboxes with memory limits and execution deadlines (default 15,000ms).

### 2.6 Event & Audit Engine (`core/events`)
- Built upon NestJS `EventEmitter2` and RxJS Subject streams.
- Emits typed events: `GoalCreatedEvent`, `TaskStateChangedEvent`, `ToolInvokedEvent`, `PermissionRequestedEvent`, `OrbStateChangedEvent`.
- Guarantees synchronous writing of all tool calls and permission approvals to the immutable `audit_logs` table.

---

## 3. NestJS Module Architecture

```
apps/api/src/
├── main.ts                           # Global validation pipes, CORS, Winston logger
├── app.module.ts                     # Root module registering feature modules
│
├── core/
│   ├── core.module.ts                # DHAVON Core bundle
│   ├── orchestrator/
│   │   ├── orchestrator.service.ts   # Cognitive execution loop
│   │   ├── intent.classifier.ts      # Intent detection & strategy selector
│   │   └── context.builder.ts        # Memory + system prompt synthesizer
│   ├── memory/
│   │   ├── memory.service.ts         # High-level memory operations
│   │   ├── semantic-search.service.ts# Vector cosine search via Supabase pgvector
│   │   └── memory.entity.ts
│   ├── goals/
│   │   ├── goals.service.ts          # Goal lifecycle management
│   │   ├── tasks.service.ts          # Task decomposition and worker
│   │   └── goal.entity.ts
│   ├── permissions/
│   │   ├── permission.service.ts     # Risk evaluation & gatekeeper
│   │   ├── permission.guard.ts       # Decorator-based route security
│   │   └── permission.types.ts
│   └── tools/
│       ├── tool-registry.service.ts  # Registry of all tools (native + MCP)
│       └── tool-sandbox.service.ts   # Execution timeout & boundary containment
│
├── providers/
│   ├── ai-provider.interface.ts      # Core AI abstraction contract
│   ├── provider-factory.ts           # Factory selecting active LLM based on env
│   ├── gemini.provider.ts            # Google Gemini implementation
│   ├── anthropic.provider.ts         # Anthropic Claude implementation
│   └── openai.provider.ts            # OpenAI GPT implementation
│
├── mcp/
│   ├── mcp.module.ts
│   ├── mcp-manager.service.ts        # Dynamic server connection lifecycle
│   ├── mcp-client.adapter.ts         # JSON-RPC / stdio / SSE transport bridge
│   └── mcp-tool-converter.ts         # Converts MCP tool schemas to LLM format
│
├── gateway/
│   ├── dhavon-ws.gateway.ts          # Socket.io / WebSocket real-time gateway
│   ├── conversation.controller.ts    # REST endpoint for thread history
│   ├── goal.controller.ts            # REST endpoint for goal management
│   └── system.controller.ts          # Health, telemetry, and diagnostics
│
├── database/
│   ├── supabase.service.ts           # Supabase client wrapper & admin client
│   └── repositories/                 # Strongly-typed repository abstractions
│
└── common/
    ├── guards/                       # SupabaseAuthGuard, RolesGuard
    ├── interceptors/                 # AuditLoggingInterceptor, TransformInterceptor
    ├── filters/                      # GlobalExceptionFilter
    └── decorators/                   # CurrentUser(), RequirePermission()
```

---

## 4. Real-Time WebSocket Protocol Specification

All fluid streaming, audio visualization updates, and orb state transitions flow over the WebSocket gateway (`/ws/dhavon`).

### Inbound Events (Client -> Server)
| Event | Payload | Description |
| :--- | :--- | :--- |
| `session:init` | `{ clientTime, timezone, activeMode }` | Handshake; initializes session context and retrieves working memory. |
| `interaction:voice_stream`| `Buffer (PCM / Opus chunk)` | Streams live microphone audio for real-time transcription. |
| `interaction:text` | `{ text: string, mode: "ask"\|"plan"\|"create"\|"analyze" }` | Sends typed or voice-transcribed prompt to DHAVON CORE. |
| `action:confirm` | `{ executionId: string, approved: boolean, reason?: string }` | Approves or rejects a gated high-risk tool action. |
| `orb:heartbeat` | `{ fps: number, clientState: string }` | Client telemetry and connection liveness. |

### Outbound Events (Server -> Client)
| Event | Payload | Description |
| :--- | :--- | :--- |
| `orb:state_transition`| `{ state: "CALM"\|"LISTENING"\|"THINKING"\|"ACTING"\|"ERROR", details?: string }` | Drives the living orb visual behavior. |
| `interaction:token_delta`| `{ delta: string, index: number, isFinal: boolean }` | Low-latency token stream for voice/text display. |
| `interaction:action_required`| `{ executionId: string, tool: string, args: any, riskLevel: string, diffPreview?: string }` | Displays interactive confirmation dialog in HUD. |
| `telemetry:phase_update`| `{ phase: "LISTENING"\|"THINKING"\|"ACTING", activeSubsystem: string }` | Updates the bottom-left 3-phase status widget. |
| `goal:updated` | `{ goalId: string, progress: number, activeTaskId: string }` | Updates real-time goal progress. |

---

## 5. Security & Input Validation Pipeline

1. **Global Validation Pipe**:
   - `whitelist: true`: Strips undeclared properties from incoming request bodies.
   - `forbidNonWhitelisted: true`: Rejects payloads with extraneous fields.
   - `transform: true`: Automatically coerces types based on DTO classes.
2. **AI Tool Argument Sanitization**:
   - LLMs can hallucinate malicious or malformed parameters. Every tool argument dictionary is re-validated through a runtime validation schema before passing to execution adapters.
3. **Execution Isolation**:
   - Tool operations run with dedicated cancellation tokens. If a tool hangs beyond the allocated timeout, it is terminated forcefully without blocking the orchestrator event loop.
