# DHAVON — Personal AI Operating System

DHAVON is an autonomous personal intelligence operating system architected around an immersive AI Observatory interface, a deterministic cognitive core (Goals, Tasks, Episodic/Semantic Memory, Permissions, Tool Sandboxing), and a native Model Context Protocol (MCP) extensibility layer.

---

## Architecture Overview

```
DHAVON/
├── apps/
│   ├── web/          # Next.js 15+ App Router, Tailwind CSS, Framer Motion, Lucide icons
│   └── api/          # NestJS 10+, REST API, WebSocket Gateway, DHAVON CORE
├── packages/
│   ├── ui/           # Shared design tokens, glassmorphism tokens, animation curves
│   ├── types/        # Shared TypeScript domain contracts and interfaces
│   └── mcp/          # Model Context Protocol abstraction and tool adapters
├── core/             # DHAVON CORE Engine subsystem interfaces
│   ├── orchestrator/ # Cognitive loop and intent routing contracts
│   ├── goals/        # Goal decomposition and task management contracts
│   ├── memory/       # Tri-layer memory and vector search contracts
│   ├── permissions/  # Four-tier risk evaluation contracts
│   ├── events/       # System event stream and audit ledger contracts
│   └── tools/        # Tool registry and execution sandbox contracts
├── supabase/
│   ├── migrations/   # Sequential SQL migrations
│   └── seed/         # Initial database seed scripts
├── tests/            # Automated test suites and Postman collections
├── docs/             # Technical deep dives and specification documents
└── docker/           # Production container configuration (Dockerfile.web, Dockerfile.api)
```

---

## Prerequisites

- **Node.js**: `>= 20.0.0` (LTS recommended)
- **pnpm**: `>= 9.0.0` (`pnpm@10.33.0` supported)
- **Docker**: (Optional, for containerized local deployment)

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd DHAVON

# Install all monorepo dependencies
pnpm install
```

---

## Environment Setup

Copy `.env.example` to `.env` in the project root:

```bash
cp .env.example .env
```

Configure your environment variables in `.env` (API keys, Supabase credentials, ports). Real credentials must never be committed to version control.

---

## Development Commands

### Start Services Individually

```bash
# Start Backend API (NestJS on port 4000)
pnpm dev:api

# Start Frontend Observatory (Next.js on port 3000)
pnpm dev:web
```

### Monorepo Build and Verification

```bash
# Build all packages and applications
pnpm build

# Run linting across all workspaces
pnpm lint

# Run strict TypeScript type checks
pnpm type-check
```

---

## Verification Endpoints

- **Backend Health Check**: `http://localhost:4000/health`
- **Frontend Boot Interface**: `http://localhost:3000`

---

## Specifications & Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — End-to-end system architecture and dataflow
- [FRONTEND.md](FRONTEND.md) — Master visual design reference specification (`DHAVON Futuristic AI Observatory.png`)
- [BACKEND.md](BACKEND.md) — DHAVON CORE cognitive engine and WebSocket protocol
- [DATABASE.md](DATABASE.md) — Supabase PostgreSQL schema, RLS policies, and pgvector search
- [MCP.md](MCP.md) — Model Context Protocol architecture and four-tier risk classification
- [DEVELOPMENT-PLAN.md](DEVELOPMENT-PLAN.md) — Six-phase engineering roadmap
