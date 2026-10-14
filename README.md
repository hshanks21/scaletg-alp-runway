# Runway Prototype — AlixPartners Budget Tool Modernization

**Scale Technology Group — Client Prototype**

A working prototype demonstrating the "art of the possible" for AlixPartners' Budget Tool modernization. Built on Scale's standard stack (React + Express + Supabase Postgres) for speed of delivery. Production deployment will migrate to Azure (App Service + SQL Server + Entra ID).

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up the database
# (Supabase project URL + keys in .env)

# Start development
pnpm dev
```

## Stack

| Layer | Technology | Production Migration |
|-------|-----------|---------------------|
| Frontend | React + Vite + Tailwind + ShadCN | Azure Static Web Apps (carries over) |
| Backend | Express + TypeScript + Drizzle ORM | Azure App Service (carries over) |
| Database | Supabase Postgres | Azure SQL / SQL Server (rewire Drizzle) |
| Auth | Supabase Auth (magic link) | Entra ID + Duo (MSAL) |

## Project Structure

```
frontend/           ← React app (Vite + Tailwind)
backend/            ← Express API (TypeScript)
docs/               ← Domain context, decisions, feature list
  CONTEXT.md        ← Domain glossary (use these terms)
  product-decisions.md
  phase1-feature-list.md
CLAUDE.md           ← Agent onboarding
AGENTS.md           ← Working protocol
PLAN.md             ← Implementation plan
```

## Phases

- **This prototype:** Demonstrate Budget creation, live profitability, approval workflow, versioning, and Budget vs. Actual — enough to win the deal.
- **Phase 1 (production):** Modernize the Budget Tool on Azure, same database.
- **Phase 2 (production):** Budget vs. Actual tracking with Actuals from SAP.

## Documentation

- [CONTEXT.md](docs/CONTEXT.md) — Domain glossary. Use these terms, not alternatives.
- [Product Decisions](docs/product-decisions.md) — How Runway behaves and why.
- [Phase 1 Feature List](docs/phase1-feature-list.md) — SOW exhibit scope.
- [PLAN.md](PLAN.md) — Implementation plan for the prototype.
