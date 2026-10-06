# Supabase Database Strategy & Migration Lifecycle

This directory contains the database migration scripts and seed data for the DHAVON Personal AI OS.

## Directory Structure
```
supabase/
├── migrations/       # Sequential SQL migration files (e.g., 001_initial_schema.sql)
├── seed/             # Initial system data and default configuration seed scripts
└── README.md         # Migration workflow documentation
```

## Migration Workflow (Phase 4 Target)
1. **Isolated DDL Scripts**: Every schema change is written as an idempotent, transaction-safe SQL migration in `migrations/`.
2. **Sequential Versioning**: Migrations follow zero-padded naming conventions: `001_core_tables.sql`, `002_rls_policies.sql`, `003_pgvector_similarity.sql`.
3. **Automated Verification**: Before applying migrations to production Supabase instances, migrations are tested against a local Supabase CLI container.
4. **Zero Downtime Constraint**: Migrations avoid destructive alterations without deprecation periods and backward compatibility.

*Note: Production table definitions, RLS policies, and vector indexes will be verified and implemented during Phase 4 (Database & Memory Engine).*
