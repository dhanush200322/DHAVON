# DHAVON — Production Deployment & Go-Live Architecture Guide

## 1. System Architecture

The DHAVON Personal AI Operating System is deployed on a hardened multi-tier control-plane architecture:

```
[ USER / CLIENT ]
       │
       ▼ (HTTPS / TLS 1.3)
[ DHAVON Observatory UI ]
  Next.js 15 Standalone (Port 3000)
  HTTP Security Headers (CSP, HSTS, X-Frame-Options)
  Web Audio API + Groq Whisper STT + SpeechSynthesis TTS
       │
       ▼ (WSS / HTTPS via Port 4000)
[ DHAVON Core API Gateway ]
  NestJS 10 (Docker Container / Non-Root User nestjs:nodejs)
  CORS Whitelisted Origin
  Rate Limiter (60 requests / 10 seconds per connection)
  10MB HTTP Payload / 1MB WebSocket Payload Limit
  Sanitized Exception Filter & Secret Scrubber
       │
       ├── Context Engine (Bounded Token History)
       ├── Memory Engine (Supabase pgvector Semantic Search + RLS)
       ├── Planner & Orchestrator (DAG Dependency Engine, Cycle Detection)
       ├── Permission Engine (Risk Classification: READ, LOW, MEDIUM, HIGH, CRITICAL)
       └── MCP Gateway (Postman, GitHub, SQLite, Notion, Render)
             │
             ├── Cryptographic Approval Tokens (5-minute TTL, single-use)
             ├── SSRF Filter (Blocks 127.0.0.1, RFC-1918, 169.254.169.254, metadata)
             ├── Sandboxed Execution Transports (15-second timeouts)
             ├── Post-Execution State Verification Engine
             └── Immutable Audit Trail
       │
       ▼
[ Supabase PostgreSQL 15+ ]
  Row Level Security (RLS) on all tables (memories, goals, tasks, audit_logs)
  pgvector Extension for Semantic Vector Embeddings
  Managed Connection Pooling
```

### Invariant Control Flow
- **AI Proposes:** AI models (Gemini 2.5 Flash, Groq) act solely as untrusted proposal generators.
- **DHAVON Validates:** Core checks input schemas and scrubs prompt injections.
- **Permission Engine Authorizes:** High/Critical actions require cryptographic single-use confirmation tickets.
- **MCP Gateway Executes:** Tool calls are isolated and bounded by 15-second timeouts.
- **Verification Validates:** Deterministic post-execution checks confirm external state changes before success.
- **Audit Records:** All operations are immutably logged with tenant isolation.

---

## 2. Production Hosting Options

### Option A: Next.js Standalone (Web) + Docker Container (API) + Hosted Supabase (Recommended)
- **Web Frontend:** Next.js standalone container deployed on Render / Vercel / Cloud Run.
- **API Core:** NestJS multi-stage container (`docker/api.Dockerfile`) on Render / Cloud Run / ECS with persistent WebSocket support.
- **Database:** Hosted Supabase PostgreSQL project with pgvector and automated daily backups.

### Option B: Unified Multi-Service Container Stack
- Render or Docker Compose running `dhavon-web:latest` and `dhavon-api:latest` connected via isolated container network (`dhavon-net`), pointing to Supabase PostgreSQL.

---

## 3. Production Environment Variables Plan

### Live Production Endpoints
- **Observatory Web Service:** `https://dhavon-web.onrender.com` (Service ID: `srv-db2ekh6k1f9s73a678l0`)
- **API Core Gateway:** `https://dhavon-api.onrender.com` (Service ID: `srv-db2eioui0phs73ed8jf0`)
- **WebSocket Gateway:** `wss://dhavon-api.onrender.com`
- **Liveness Probe:** `https://dhavon-api.onrender.com/health/live`
- **Readiness Probe:** `https://dhavon-api.onrender.com/health/ready`

### Public Client Variables (`apps/web/.env.production` / Web Service Environment)
> [!NOTE]
> These variables are exposed to the browser bundle and MUST ONLY contain public-safe endpoints.

| Variable | Description | Production Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Production REST API URL | `https://dhavon-api.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | Production WebSocket URL | `wss://dhavon-api.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project REST URL | Configured from environment |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for authenticated client access | Configured from environment |

### Server-Only Secrets (`apps/api/.env` / API Secrets Manager)
> [!CAUTION]
> NEVER expose these variables in the frontend or commit them to Git.

| Variable | Description | Security Tier |
|---|---|---|
| `API_PORT` | HTTP/WS listen port (default: 4000) | Configuration |
| `NODE_ENV` | Must be `production` | Configuration |
| `CORS_ORIGIN` | Allowed web origin (e.g., `https://app.dhavon.ai`) | Security |
| `DATABASE_URL` | Direct PostgreSQL connection string | Critical Secret |
| `SUPABASE_URL` | Supabase Project REST URL | Configuration |
| `SUPABASE_ANON_KEY` | Public anonymous key | Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase privileged server key (bypasses RLS server-side) | Critical Secret |
| `JWT_SECRET` | 32+ character high-entropy key for token signing | Critical Secret |
| `GEMINI_API_KEY` | Google AI Studio / Gemini API credential | Critical Secret |
| `GROQ_API_KEY` | Groq API credential for Whisper STT and fast inference | Critical Secret |
| `RESEND_API_KEY` | Resend API credential for transactional notifications | Critical Secret |
| `MCP_POSTMAN_API_KEY` | Postman API Key for MCP Gateway integration | Critical Secret |
| `MCP_GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub PAT for repository tools | Critical Secret |

---

## 4. Secret Management Strategy

1. **Zero Git Storage:** All credential files (`.env`, `.env.local`, `.env.production`) are excluded in `.gitignore`.
2. **Runtime Secret Injection:** Secrets are injected directly via hosting platform dashboards (e.g. Render Environment Variables, AWS Secrets Manager, GitHub Secrets).
3. **Automated Secret Scrubbing:** If a secret accidentally enters user input or system memory, [`secret-scrubber.util.ts`](file:///c:/Users/ro224/OneDrive/Desktop/DHAVON/apps/api/src/core/memory/secret-scrubber.util.ts) sanitizes it prior to database persistence or logging.
4. **Leak Verification:** Pre-deployment scan enforces zero hardcoded keys in tests, source files, or Docker layers.

---

## 5. Docker Deployment Procedures

### Multi-Stage Container Builds
```bash
# Build production API container (size: ~288MB, non-root user nestjs:1001)
docker build -t dhavon-api:production -f docker/api.Dockerfile .

# Build production Web container (size: ~279MB, non-root user nextjs:1001)
docker build -t dhavon-web:production -f docker/web.Dockerfile .
```

### Docker Compose Production Startup
```bash
# Start both services in detached mode with automated health monitoring
docker compose up -d

# Verify service health and container status
docker compose ps
docker compose logs -f
```

---

## 6. Supabase Configuration & Production Safety

### Verifying Schema & Migrations
1. Ensure `supabase/migrations/` (001 through 004) are applied in sequence.
2. Verify Row-Level Security is enabled across all tables:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```
3. Confirm RLS policies isolate records by `auth.uid() = user_id`.
4. Ensure `vector` extension is installed for pgvector semantic search (`CREATE EXTENSION IF NOT EXISTS vector;`).

---

## 7. WebSocket Configuration

- **Transport:** Engine.io / Socket.io with WebSocket upgrade.
- **Port:** Shares port `4000` with the HTTP server via NestJS gateway adapter.
- **Origin Check:** Enforces origin verification matching `CORS_ORIGIN`.
- **Authentication:** Validates Bearer token on connection handshake.
- **Rate Limiting:** Enforces 60 events per 10-second rolling window per socket.
- **Tenant Isolation:** Events are strictly routed to `user_${userId}` socket rooms.

---

## 8. CORS & HTTP Security Headers

### CORS Whitelisting
In [`apps/api/src/main.ts`](file:///c:/Users/ro224/OneDrive/Desktop/DHAVON/apps/api/src/main.ts):
```typescript
origin: (origin, callback) => {
  const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim());
  if (!origin || allowed.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Blocked by CORS'));
  }
}
```

### Security Headers
Configured in [`apps/web/next.config.mjs`](file:///c:/Users/ro224/OneDrive/Desktop/DHAVON/apps/web/next.config.mjs):
- `Content-Security-Policy`: Restricts script and object sources while permitting Web Audio and WebSocket connections.
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options`: `nosniff`
- `X-Frame-Options`: `DENY`
- `Referrer-Policy`: `strict-origin-when-cross-origin`

---

## 9. Health Checks & Probes

| Endpoint | Type | Purpose | Healthy Response |
|---|---|---|---|
| `GET /health/live` | Liveness | Answers: "Is the process responsive?" | `{"status":"ok","service":"dhavon-api"}` |
| `GET /health/ready` | Readiness | Answers: "Are DB and subsystems ready?" | `{"status":"ok","ready":true}` |
| `GET /health` | Telemetry | Deep diagnostic status for internal operations | Full subsystem report (sanitized) |

---

## 10. Domain & DNS Configuration

When deploying with a custom domain (e.g. `dhavon.ai`):
- **Web App:** `https://app.dhavon.ai` (CNAME pointing to Web Service)
- **API Core:** `https://api.dhavon.ai` (CNAME pointing to API Service)
- **WebSocket:** `wss://api.dhavon.ai` (automatically routed over HTTPS/WSS)
- **CORS Config:** Set `CORS_ORIGIN=https://app.dhavon.ai`

---

## 11. Monitoring & Observability

- **Logs:** JSON structured logging with automatic secret scrubbing.
- **Audit Logs:** Immutable database entries for all MCP tool executions, approvals, and security events.
- **Process Signals:** `SIGTERM` and `SIGINT` trigger graceful shutdown via `app.enableShutdownHooks()`.

---

## 12. Backup Strategy

- **Database:** Supabase automated daily snapshots + Point-In-Time Recovery (PITR) with 7-day retention.
- **Config & State:** Zero ephemeral state stored in container filesystem; all state is persisted to Supabase.
- **Audit Logs:** Protected with append-only RLS policy preventing modification or deletion.

---

## 13. Recovery & Rollback Procedures

### Rollback Process
1. **Container Revert:** Redeploy previous Docker image tag (`dhavon-api:<prev-sha>`, `dhavon-web:<prev-sha>`).
2. **Environment Revert:** Revert environment variable changes in the hosting dashboard.
3. **Database Guard:** Database migrations are strictly additive (`IF NOT EXISTS`). Never execute destructive rollback scripts against live production tables.
4. **Health Verification:** Test `/health/live` and `/health/ready` immediately post-rollback.

---

## 14. Post-Deployment Verification Checklist

- [ ] Web application loads over HTTPS (`HTTP 200`)
- [ ] Next.js standalone server runs under non-root user `nextjs`
- [ ] API container answers `/health/live` with `{"status":"ok"}`
- [ ] API container answers `/health/ready` with `{"ready":true}`
- [ ] WebSocket handshake succeeds over WSS
- [ ] JWT authentication validates user identity
- [ ] Tenant isolation verified: User A cannot receive User B events
- [ ] Gemini and Groq AI inference responds within timeout limits
- [ ] Memory recall searches pgvector successfully
- [ ] Goal decomposition and DAG tasks execute
- [ ] MCP tool execution respects single-use confirmation tickets
- [ ] SSRF filter blocks access to internal network targets
- [ ] Groq Whisper STT transcribes microphone input
- [ ] SpeechSynthesis TTS renders response audio
- [ ] Barge-in cancels active TTS speech upon user interruption
- [ ] Graceful shutdown drains WebSocket connections without dangling processes
