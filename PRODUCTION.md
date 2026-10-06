# DHAVON — Production Architecture & Operations Manual

## 1. System Architecture

The DHAVON Personal Intelligence Operating System operates on a strict multi-tier, supervised control-plane architecture:

```
[ USER ]
   │
   ▼
[ DHAVON Observatory UI ] (Next.js 15 Standalone / Web Audio / WebSocket Client)
   │ (Port 3000)
   ▼
[ HTTP & WebSocket Gateway ] (NestJS / Socket.io / Rate-Limited / CORS Gated)
   │ (Port 4000)
   ▼
[ DHAVON Core Controller ]
   │
   ├── Context Manager (Bounded context, token window limits)
   ├── Memory Engine (Supabase pgvector semantic embeddings + RLS)
   ├── Goal Decomposition & Planner (DAG dependency resolver)
   ├── Permission Engine (Risk tiers: READ, LOW, MEDIUM, HIGH, CRITICAL)
   └── MCP Gateway (Postman, GitHub, SQLite, Notion, Render)
         │
         ├── Approval Ticket Engine (Single-use, 5-minute TTL, owner-verified)
         ├── Controlled Tool Invoker (Timeout-guarded, SSRF-filtered)
         ├── Verification Engine (Post-execution schema & state validation)
         └── Audit Trail (Immutable tenant-isolated event logs)
   │
   ▼
[ Persistence & State ] (Supabase Hosted PostgreSQL + Vector Extension)
```

### Invariant Security Hierarchy:
- **AI Proposes:** AI models (Gemini 2.5 Flash, Groq LLaMA/Whisper) are treated strictly as untrusted planning engines.
- **DHAVON Validates:** Core enforces strict input sanitization, prompt injection scrubbing, and schema compliance.
- **Permission Engine Authorizes:** High-risk actions require explicit human-in-the-loop cryptographically bound confirmation tokens.
- **MCP Gateway Executes:** Sandboxed execution via isolated transports with strict timeout boundaries.
- **Verification Validates:** Deterministic post-execution checks ensure external changes match expectations before marking tasks complete.
- **Audit Records:** Every action, decision, token usage, and approval is immutably logged.

---

## 2. Required Environment Variables

All secrets are injected exclusively via secure server-side environment variables or secrets managers. **Zero secrets are committed to version control.**

### Browser-Safe Frontend Variables (`apps/web/.env.local` / Docker env)
| Variable | Description | Classification |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base HTTP endpoint for DHAVON API (e.g. `http://localhost:4000`) | Public Safe |
| `NEXT_PUBLIC_WS_URL` | WebSocket endpoint for DHAVON Gateway (e.g. `http://localhost:4000`) | Public Safe |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public Safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Supabase public anon key for authenticated client access | Public Safe |

### Backend Secure Variables (`apps/api/.env` / Secrets Manager)
| Variable | Description | Classification | Status |
|---|---|---|---|
| `PORT` / `API_PORT` | HTTP/WS listen port (default: `4000`) | Configuration | Configured |
| `NODE_ENV` | Application runtime mode (`production` or `development`) | Configuration | Configured |
| `CORS_ORIGIN` | Allowed web origins (comma-separated, e.g. `http://localhost:3000`) | Security | Configured |
| `DATABASE_URL` | PostgreSQL direct connection URI | Secret | Configured |
| `SUPABASE_URL` | Supabase project REST URL | Secret | Configured |
| `SUPABASE_ANON_KEY` | Supabase project anonymous key | Secret | Configured |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase privileged service-role key (server-side only) | Critical Secret | Configured |
| `JWT_SECRET` | Secret key for signing/verifying DHAVON session tokens | Critical Secret | Configured |
| `GEMINI_API_KEY` | Google Gemini API credentials for AI cognitive reasoning | Critical Secret | Configured |
| `GROQ_API_KEY` | Groq Cloud API credentials for Whisper STT and fast inference | Critical Secret | Configured |
| `RESEND_API_KEY` | Resend API credentials for notification dispatch | Critical Secret | Configured |
| `MCP_POSTMAN_API_KEY` | Postman API credential for MCP Gateway tool integration | Critical Secret | Configured |
| `MCP_GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub Personal Access Token for repo MCP tools | Critical Secret | Configured |

> [!CAUTION]
> Never prepend `NEXT_PUBLIC_` to `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, or any AI/MCP provider keys. Doing so bundles them into client-side JavaScript.

---

## 3. Local Production Build Procedure

To verify production buildability locally without running development daemons:

```bash
# 1. Clean and lock dependencies
pnpm install --frozen-lockfile

# 2. Workspace static type checking
pnpm type-check

# 3. Source linting
pnpm lint

# 4. Monorepo automated test suite (Jest 23 suites, 106 tests)
pnpm test

# 5. Production package and application compilation
pnpm build
```

---

## 4. Docker Build Procedure

DHAVON provides production-hardened multi-stage Dockerfiles utilizing Alpine Linux and unprivileged runtime users.

### API Image Build:
```bash
docker build -t dhavon-api:latest -f docker/api.Dockerfile .
```
- Multi-stage build isolates builder dependencies from runtime container.
- Runs as non-root user `nestjs:nodejs` (UID/GID 1001).
- Installs only required production workspace packages.

### Web Image Build:
```bash
docker build -t dhavon-web:latest -f docker/web.Dockerfile .
```
- Uses Next.js standalone output tracing to minimize container footprint.
- Runs as non-root user `nextjs:nodejs` (UID/GID 1001).
- Copies minimal build artifacts (`.next/standalone`, `.next/static`, `public`).

---

## 5. Docker Startup & Container Orchestration

Run the complete DHAVON stack locally or on production container hosts using `docker-compose`:

```bash
# Start all services detached with build verification
docker compose up -d --build

# View container logs
docker compose logs -f

# Check container health status
docker compose ps

# Graceful stack termination
docker compose down
```

### Resource Conscious Defaults:
- `dhavon-api`: Memory limit: 1024MB, CPU reservation: 0.5 cores.
- `dhavon-web`: Memory limit: 512MB, CPU reservation: 0.25 cores.
- Isolated Docker bridge network: `dhavon-net`.

---

## 6. Health Checks & Probes

The API exposes three distinct, unauthenticated health endpoints designed for Kubernetes, AWS ECS, or Docker Compose health monitors. All endpoints sanitize responses to prevent leaking internal database URIs, API keys, or stack traces.

### 1. Liveness Probe (`GET /health/live`)
- **Purpose:** Answers *"Is the Node.js event loop responsive?"*
- **Response:**
  ```json
  {
    "status": "ok",
    "service": "dhavon-api",
    "timestamp": "2026-10-06T03:52:32.076Z"
  }
  ```
- **HTTP Code:** `200 OK`

### 2. Readiness Probe (`GET /health/ready`)
- **Purpose:** Answers *"Can the API safely accept and process client traffic?"* Checks database connectivity without exposing connection details.
- **Response:**
  ```json
  {
    "status": "ok",
    "ready": true,
    "timestamp": "2026-10-06T03:52:33.026Z"
  }
  ```
- **HTTP Code:** `200 OK` (or `503 Service Unavailable` if database is unreachable).

### 3. Comprehensive Diagnostic Health (`GET /health`)
- **Purpose:** Detailed diagnostic reporting on all connected subsystems (API, Database, AI Providers, MCP Gateway, Core).
- **HTTP Code:** `200 OK`.

---

## 7. Supabase Migration Procedure

Database migrations reside in `supabase/migrations/` and must be applied sequentially and idempotently.

### Migration Inventory:
1. `001_initial_schema.sql` — Core schema: profiles, conversations, messages, goals, tasks, audit_logs.
2. `002_vector_memory.sql` — pgvector extension, memories table, `match_memories` cosine similarity RPC.
3. `003_mcp_gateway.sql` — MCP servers, tools, permissions, execution approval logs.
4. `004_security_hardening.sql` — Strict RLS tenant-isolation policies, audit integrity constraints, memory ownership policies.

### Applying Migrations:
```bash
# Link Supabase CLI to hosted project
supabase link --project-ref <PROJECT_REF>

# Apply pending migrations safely
supabase db push
```

> [!WARNING]
> NEVER execute `supabase db reset` in a production environment as it drops all existing tables and data.

---

## 8. Database Backup Strategy

- **Status:** **NOT CONFIGURED LOCALLY** (Managed by Hosted Supabase Platform).
- **Production Requirement:**
  - Automated Daily Backups: Configured via Supabase Pro/Team tier with Point-In-Time-Recovery (PITR).
  - Retention Window: Minimum 7 days (standard) or 30 days (compliance).
  - Manual Backup Export: `supabase db dump -f backup_$(date +%Y%m%d).sql`.
  - Backup Validation: Regular quarterly dry-run restore to a staging project.

---

## 9. Database Restore Procedure

If disaster recovery or data corruption necessitates restoring database state:
1. **Target Isolation:** Put the DHAVON API into maintenance mode (drain WebSocket connections, pause container).
2. **PITR Restore:** In the Supabase Dashboard, select **Database > Backups**, select the point in time immediately prior to the incident, and confirm restoration.
3. **CLI Restore (if using dump file):**
   ```bash
   psql -h <DB_HOST> -U postgres -d postgres -f backup_<TIMESTAMP>.sql
   ```
4. **Verification:** Query `GET /health/ready` and execute `node test-memory-recall.js` to verify pgvector integrity.
5. **Resume Traffic:** Unpause the API containers.

---

## 10. Secret Management

- Secrets must reside in encrypted secret vaults (AWS Secrets Manager, Doppler, Vault, or Cloud Run Environment Secrets).
- Secret rotation policy: Rotate API keys and JWT secrets every 90 days.
- In-flight scrubbing: All user inputs, logs, and error responses pass through the Phase 7 `SecretScrubber` regex engine to prevent accidental credential leakage in exception logs.

---

## 11. Log Management

- **Format:** Structured JSON logging in production mode (`{"timestamp": "...", "level": "INFO", "context": "...", "message": "..."}`).
- **Sanitization:** Sensitive tokens, Bearer strings, private keys, and raw microphone audio are stripped before logging.
- **Aggregation:** In production, ship container stdout to an aggregator (Datadog, Loki, CloudWatch).

---

## 12. Monitoring & Alerting

- **Application Metrics:**
  - Liveness & Readiness probe failure rate.
  - WebSocket active connection count and disconnect frequency.
  - MCP Tool execution latency and failure rate.
  - AI Provider latency (Gemini/Groq) and token consumption.
- **Alert Thresholds:**
  - 5xx error rate > 1% over 5 minutes -> P2 Alert.
  - Liveness failure for > 3 consecutive checks -> P1 Alert (Auto-restart).
  - Rate limit tripping spike (> 50 in 1 minute) -> Security Warning.

---

## 13. Rate Limiting

- **WebSocket Tier:**
  - Configured at **60 requests per 10 seconds** per client socket.
  - Payload limit: **1 MB** max message size.
  - Disconnect penalty: Sockets exceeding limits receive `dhavon.error` and are disconnected.
- **Status:** **CONFIGURED** (In-Memory per API node).
- **Future Scale:** **FUTURE** (Redis-backed token bucket across horizontally scaled nodes).

---

## 14. WebSocket Scaling & High Availability

- **Current Architecture:** Single-instance or sticky-session multi-instance WebSocket gateway via Socket.io.
- **Tenant Isolation:** Every incoming event extracts and validates the user JWT; subscriptions are scoped strictly to the authenticated `user_id`. Cross-user event leakage is blocked by design.
- **Graceful Cleanup:** Sockets listen for disconnect events, releasing active voice sessions, aborting pending tasks, and unsubscribing from event emitters.

---

## 15. MCP Configuration & Boundary

- **Discovery:** On boot, the MCP Gateway connects to configured local or remote MCP servers (`Postman`, `GitHub`, `SQLite`, `Notion`, `Render`).
- **Risk Assessment:** Tools are classified into risk tiers:
  - `READ`: Safe, read-only queries (auto-executable under supervision).
  - `MUTATION`: High risk, external mutations (requires single-use approval ticket).
  - `DESTRUCTIVE`: Critical risk, deletion or overwrite (requires explicit MFA/ticket).
- **Ticket Expiration:** Approvals expire in 5 minutes (300 seconds), can be used only once, and are bound to the specific goal, task, and parameters.

---

## 16. AI Provider Configuration & Resilience

- **Primary Cognitive Reasoning:** Google Gemini 2.5 Flash.
- **Fast Inference & STT:** Groq Cloud (LLaMA 3.3 70B & Whisper Large V3).
- **Resilience Engine:**
  - Max Retries: `2` attempts with exponential backoff.
  - Timeout: 30,000ms per LLM completion request.
  - Graceful Fallback: If Gemini is unavailable, the system safely falls back or returns an actionable notification to the user without crashing.

---

## 17. Voice Requirements & Microphone Lifecycle

- **STT:** Groq Whisper STT endpoint (`POST /voice/transcribe`).
- **TTS:** Browser-native Web Speech Synthesis (zero backend audio rendering cost; zero private voice data transit).
- **Audio Privacy:** Raw microphone audio is captured in chunks in browser memory, transcribed, and immediately freed. No raw audio is ever persisted to database or disk.
- **Barge-in Support:** Active speech recognition immediately interrupts ongoing TTS playback via `window.speechSynthesis.cancel()`.

---

## 18. Failure Recovery Scenarios

| Failure Scenario | Automatic Recovery Behavior | User Impact |
|---|---|---|
| AI Provider Outage | Catches provider error, retries twice, returns graceful error | Informs user AI is temporarily unavailable |
| Supabase DB Network Blip | Connection pool reconnects; readiness probe flags unhealthy | Brief retry on pending queries |
| MCP Server Disconnect | Gateway flags server OFFLINE; skips dependent tasks | Tasks requiring tool are paused/blocked |
| WebSocket Drop | Client automatically reconnects with backoff (1s, 2s, 5s) | Re-syncs latest goal/task state |
| Invalid/Expired Approval | Approval rejected with HTTP 403 / WS error | User must re-request action |

---

## 19. Rollback Procedure

In the event of a faulty deployment:
1. **Container Rollback:**
   ```bash
   docker compose down
   # Re-tag previous stable release image
   docker tag dhavon-api:previous dhavon-api:latest
   docker tag dhavon-web:previous dhavon-web:latest
   docker compose up -d
   ```
2. **Database Migration Rollback:**
   - Database migrations are additive and non-destructive. If rollback is necessary, apply a forward compensation migration (`005_revert_feature.sql`).
3. **Cache Purge:** Clear Next.js build cache and restart web containers.

---

## 20. Production Security Checklist

- [x] All production secrets removed from Git repository and source code.
- [x] `.gitignore` hardened against `.env*` and sensitive artifacts.
- [x] Multi-stage Dockerfiles running as unprivileged non-root users.
- [x] Next.js configured with standalone output and strict HTTP security headers.
- [x] NestJS configured with graceful shutdown hooks (`SIGTERM`/`SIGINT`).
- [x] Safe liveness (`/health/live`) and readiness (`/health/ready`) probes active.
- [x] Supabase Row Level Security (RLS) active on all tables with tenant isolation.
- [x] Single-use approval tickets with 5-minute TTL protecting MCP mutation tools.
- [x] SSRF filter blocking loopback, cloud metadata (169.254.169.254), and private IPs.
- [x] WebSocket rate-limiting (60 req / 10s) and 1MB payload limits enforced.
- [x] Secret scrubbing active on all user inputs, error outputs, and memory persistence.
- [x] Zero regressions across 23 Jest test suites and 7 end-to-end integration test suites.
- [x] Production status: **NOT DEPLOYED** (Ready for deployment on command).
