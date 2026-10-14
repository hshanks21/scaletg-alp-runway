# AGENTS.md — Runway Prototype Working Protocol

> Read this before making changes. Then load CLAUDE.md and docs/CONTEXT.md.

## Orientation (read these first)
- [CLAUDE.md](./CLAUDE.md) — Tech stack, patterns, domain terms, design direction.
- [PLAN.md](./PLAN.md) — What we're building and in what order.
- [docs/CONTEXT.md](./docs/CONTEXT.md) — Domain glossary. **Use these terms exactly.**
- [docs/product-decisions.md](./docs/product-decisions.md) — How Runway behaves and why.
- [docs/phase1-feature-list.md](./docs/phase1-feature-list.md) — Feature scope.

## How we work here
- Branch per feature: `feat/<description>`, PR to `main`.
- Small, scoped changes. One feature per PR.
- Conventional commits: `feat:`, `fix:`, `style:`, `docs:`, `refactor:`.

## Coding conventions
- TypeScript strict mode.
- Drizzle ORM for all database access — no raw SQL in routes.
- Frontend: React functional components, hooks, ShadCN primitives.
- **Use domain terms from CONTEXT.md** in code, variable names, types, and UI labels. This is non-negotiable.
- Light theme — this is a corporate financial tool, NOT a dark dev dashboard.

## Testing & verification
- Backend: verify API responses with curl or test scripts.
- Frontend: visual verification + type checking (`tsc --noEmit`).
- Profitability calculations: verify against the sample data expectations.

## Guardrails (do NOT)
- Do NOT use dark theme colors. This is a light, professional UI.
- Do NOT use the wrong domain terms (see CONTEXT.md _Avoid_ lists).
- Do NOT build auth beyond Supabase magic link — Entra ID is production scope.
- Do NOT build SAP integration — seed sample data instead.
- Do NOT commit `.env` files or credentials.
- Do NOT over-engineer — this is a prototype to win a deal.

## Definition of done
- Builds cleanly (`tsc --noEmit` + `pnpm build`).
- Matches the domain vocabulary exactly.
- Looks professional on a 1920×1080 screen.
- KPI calculations produce correct numbers from the sample data.
