# DHAVON — Model Context Protocol (MCP) Architecture
**Dynamic Tool Registry & Protocol Adapter Specification**
*Standardized Extensibility, Sandboxing, Risk-Gated Tool Invocations*

---

## 1. Architectural Role of MCP in DHAVON

In DHAVON, external capabilities (code repositories, cloud databases, calendars, communication channels, deployment platforms) are **never hardcoded into the AI Orchestrator**. 

Instead, DHAVON treats external systems as Model Context Protocol (MCP) servers. The **DHAVON MCP Layer** (`packages/mcp` and `apps/api/src/mcp`) acts as an intelligent abstraction bridge that:
1. Dynamically discovers available tools, resources, and prompt templates from connected MCP servers.
2. Translates MCP Tool Schemas into vendor-neutral LLM function calling definitions.
3. Classifies each tool under DHAVON's **Four-Tier Risk Model**.
4. Intercepts dangerous operations to enforce interactive human confirmation.
5. Sandboxes execution with timeouts, cancellation tokens, and synchronous audit logging.

```
+───────────────────────────────────────────────────────────────────+
│                          AI Orchestrator                          │
+──────────────────────────────────┬────────────────────────────────+
                                   │ Requests Tool Execution
                                   ▼
+───────────────────────────────────────────────────────────────────+
│                       DHAVON Tool Registry                        │
│          Schema Normalization • Argument Validation (Zod)         │
+──────────────────────────────────┬────────────────────────────────+
                                   │
                                   ▼
+───────────────────────────────────────────────────────────────────+
│                         Permission Engine                         │
│   Evaluates Tool Risk: READ | LOW | CONFIRMATION | SENSITIVE      │
+──────────────────────────────────┬────────────────────────────────+
                                   │ Passed / Confirmed
                                   ▼
+───────────────────────────────────────────────────────────────────+
│                         DHAVON MCP Manager                        │
│     Connection Pooling • Transport Routing • Protocol Isolation   │
+───────┬──────────────────────────┬──────────────────────────┬─────+
        │ Stdio Transport          │ SSE Transport            │ WebSocket
        ▼                          ▼                          ▼
+─────────────────+        +─────────────────+        +─────────────────+
│ GitHub MCP      │        │ Supabase MCP    │        │ Postman /       │
│ Repo, PRs, Git  │        │ DB, RLS, SQL    │        │ Notion / GSuite │
+─────────────────+        +─────────────────+        +─────────────────+
```

---

## 2. MCP Core Interfaces & Contracts (`packages/mcp`)

```typescript
export type McpRiskLevel = 'READ' | 'LOW_RISK' | 'CONFIRMATION_REQUIRED' | 'SENSITIVE';

export interface IMcpToolDefinition {
  name: string;
  description: string;
  serverName: string;
  riskLevel: McpRiskLevel;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  timeoutMs?: number;
  requiresUserConfirmation?: boolean;
}

export interface IMcpToolExecutionRequest {
  toolName: string;
  serverName: string;
  arguments: Record<string, any>;
  userId: string;
  conversationId: string;
  confirmedByUser?: boolean;
}

export interface IMcpToolExecutionResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  executionDurationMs: number;
  requiresFollowUp?: boolean;
}

export interface IMcpServerConfig {
  name: string;
  transport: 'stdio' | 'sse' | 'websocket';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
  defaultRiskLevel?: McpRiskLevel;
}
```

---

## 3. Four-Tier Risk Classification Matrix

Every tool provided by an MCP server is assigned a risk level by default or overridden via the user's security configuration:

| Tier | Risk Level | Description | Auto-Execute | UI Presentation | Example Tools |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **`READ`** | Safe read-only inspection of public or read-permitted data. | **Yes** | Subtle icon glow in HUD | `github:get_file_contents`, `notion:API-post-search`, `supabase:list_tables` |
| **2** | **`LOW_RISK`** | Additive, easily reversible operations or draft creation. | **Yes** | Notification toast + audit entry | `github:create_issue`, `postman:createCollection`, `notion:API-create-a-comment` |
| **3** | **`CONFIRMATION_REQUIRED`** | State mutations affecting shared projects or external parties. | **No** | Full interactive diff modal in Observatory HUD | `github:push_files`, `github:create_pull_request`, `supabase:apply_migration` |
| **4** | **`SENSITIVE`** | Irreversible destruction, permission elevation, or secret management. | **No** | Explicit modal dialog + password/biometric re-entry | `github:delete_branch`, `supabase:execute_sql`, `render:delete_service` |

---

## 4. Planned Progressive MCP Integrations

DHAVON's roadmap integrates tools in structured waves:

### Wave 1: Core Engineering & Testing (Initial Foundations)
1. **GitHub MCP Server**:
   - Capabilities: Repository search, file tree reading, branch creation, pull request generation, commit inspection.
   - Purpose: Allows DHAVON to inspect its own codebase, write features, and open pull requests autonomously under user supervision.
2. **Supabase MCP Server**:
   - Capabilities: Database introspection, migration execution, RLS policy validation, schema checking.
   - Purpose: Enables DHAVON to maintain its own database layer and build backend features safely.
3. **Postman MCP Server**:
   - Capabilities: API collection execution, spec synchronization, mock server testing, request validation.
   - Purpose: Autonomous contract testing and API verification directly from DHAVON's cognitive engine.

### Wave 2: Personal Knowledge & Workflow (Cognitive Sync)
1. **Notion MCP Server**:
   - Capabilities: Page reading, database querying, meeting notes summarization, task sync.
   - Purpose: Connects DHAVON to the user's personal knowledge bases and external planning documents.
2. **Google Workspace (Gmail, Calendar, Drive) MCP**:
   - Capabilities: Agenda inspection, email draft creation, document retrieval.
   - Purpose: Bridges the Observatory with daily scheduling and communication management.

### Wave 3: Deployment & Production Infrastructure
1. **Vercel / Render MCP**:
   - Capabilities: Deployment tracking, environment variable management, build logs analysis.
   - Purpose: Enables continuous self-deployment and health monitoring.
2. **Figma MCP**:
   - Capabilities: Design token extraction, frame inspection, component hierarchy reading.
   - Purpose: Visual verification and design-to-code alignment.

---

## 5. Security Sandboxing & Timeout Containment

1. **Timeout Enforcement**:
   - Every MCP call is wrapped in a `Promise.race` with an AbortController.
   - Default timeout: `15,000ms`.
   - Long-running tasks (e.g. large file generation or database backup) must explicitly declare a heartbeat or be scheduled via DHAVON's Task Engine.
2. **Input Sanitization**:
   - Tool arguments are validated against the tool's JSON Schema using Zod or Ajv before transmission across the transport layer.
   - Any argument containing path traversal (`../`) or shell injection tokens is rejected immediately.
3. **Audit Immutability**:
   - Invocations produce a synchronous entry in `public.tool_executions` with `status: 'pending'`.
   - Upon return or error, the entry is finalized with execution time, returned payload hash, and HTTP/RPC status.
