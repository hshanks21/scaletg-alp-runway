# CLAUDE.md — Runway Prototype Agent Onboarding

How to work in this codebase. Read this first, then `docs/CONTEXT.md` for domain terms.

---

## Project

Runway is a prototype for AlixPartners' Budget Tool modernization. It demonstrates engagement budgeting, live profitability calculation, approval workflows, versioning, and Budget vs. Actual tracking. Built on Scale's standard stack for speed — production will migrate to Azure.

**This is a prototype to win a deal, not production code.** Speed matters. But the React frontend carries over almost entirely to production, so build it well.

---

## Quick Orientation

```
frontend/src/
  pages/           ← One file per route
  components/
    ui/            ← ShadCN primitives
    budget/        ← Budget-specific components
    engagement/    ← Engagement components
  layouts/
    AppLayout.tsx  ← Sidebar + topbar + content
  lib/
    api.ts         ← Typed fetch wrapper
    supabase.ts    ← Supabase client + auth
    calculations.ts ← Profitability calc engine
  types/           ← Shared TypeScript types

backend/src/
  server.ts        ← Express app
  routes/          ← Express routers
  services/        ← Business logic
  db/
    client.ts      ← Drizzle + Supabase connection
    schema/        ← Drizzle schema (one file per table)
    migrations/    ← SQL migrations
    seeds/         ← Sample data for demo
```

---

## Domain Terms (MANDATORY)

**Read `docs/CONTEXT.md` before writing ANY code.** Use the exact terms defined there. The client is a consulting firm — their vocabulary is precise:

| Use this | NOT this |
|----------|----------|
| Engagement | Project, job |
| Budget | Estimate, forecast |
| Task | Workstream, phase, line item |
| Allocation | Assignment, booking |
| Resource | Consultant, employee |
| Placeholder | TBD resource, generic |
| Period | Bucket, column, slot |
| Checkpoint | Version, snapshot |
| Baseline | Original budget |
| Actuals | Timesheets, incurred |
| Forecast | Projection, re-budget |

**If you use the wrong term in code, variable names, or UI labels, it will be rejected.**

---

## Key Concepts

### Budget Building Flow
```
Engagement (client, dates, fee)
  └── Budget (period type: weekly or monthly)
       └── Tasks (named work units with estimated hours)
            └── Allocations (Resource × Task × Period hours)
```

### Profitability (recalculates live)
- Revenue = sum of (allocation hours × engagement rate) by Resource
- Cost = sum of (allocation hours × cost rate) by Resource
- Margin = Revenue - Cost
- Margin % = Margin ÷ Revenue
- Realization = engagement fees ÷ fees at standard rates
- Leverage = Staff hours ÷ PMD hours

### Approval Flow
```
Draft → Submitted → Approved (becomes Baseline)
                  → Rejected (back to Draft with comment)
Approved → Modified → Re-submitted (if threshold crossed)
```

### Budget vs. Actual (Phase 2 in prototype)
- Past periods: Forecast defaults to Actuals
- Future periods: Forecast defaults to Budget
- Engagement Owner edits Forecast hours
- KPIs: margin, margin %, realization, leverage, variances

---

## Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | React 18 + Vite + Tailwind + ShadCN | Dark theme NOT appropriate — use professional/corporate light theme |
| Backend | Express + TypeScript | Drizzle ORM targeting Supabase Postgres |
| Auth | Supabase Auth | Magic link for prototype; Entra ID in production |
| Icons | Iconify (Lucide set) | `lucide:icon-name` |

---

## Design Direction

**This is NOT Fulcrum's dark theme.** AlixPartners is a traditional consulting firm. The design should be:

- **Light theme** — clean, professional, corporate
- **Dense but readable** — lots of data on screen (budgets are complex)
- **Staffing plan layout** — Tasks as rows, Periods as columns, Resources nested under Tasks
- **Live margin panel** — always visible, updates as the user edits
- **No gradients, no rounded cards, no SaaS feel** — this is a financial tool for senior partners

Color direction:
- White/gray backgrounds
- Dark text (#1a1a1a)
- Blue accent for actions (#2563EB)
- Green/red for positive/negative margin
- Subtle borders, minimal shadows

---

## API Pattern

```ts
// Frontend
const res = await api.get<{ data: Engagement[] }>("/api/engagements");
const res = await api.post<{ data: Engagement }>("/api/engagements", body);

// Backend response shape
res.json({ success: true, data: result });
res.status(400).json({ success: false, error: "message" });
```

---

## Database Schema (key tables)

```
engagements        — client, name, owner, dates, fee, period_type, status
tasks              — engagement_id, name, estimated_hours, start, periods
resources          — name, resource_category, cost_rate, standard_rate
allocations        — task_id, resource_id, period_start, hours, engagement_rate
checkpoints        — engagement_id, kind (submitted/approved/modified), snapshot
actuals            — engagement_id, resource_id, period_start, hours
forecasts          — engagement_id, resource_id, period_start, hours (editable)
```

---

## Sample Data

Seed 2-3 realistic Engagements for the demo:
1. **"Project Phoenix" (Fixed Fee, $2.5M, 6 months)** — restructuring engagement with 8 Resources across 3 Tasks, approved, some Actuals
2. **"Operation Atlas" (Fixed Fee, $1.2M, 3 months)** — smaller engagement in Draft, being built
3. **"Meridian Advisory" (Fixed Fee, $4M, 12 months)** — large engagement, approved, Budget vs. Actual view with variances

Resource Categories: Partner, PMD, Senior Vice President, Vice President, Associate

---

## What NOT to build

- Entra ID / Duo auth (use Supabase magic link)
- SAP ETL integration (seed sample data)
- Excel export
- Coexistence with the legacy Budget Tool
- Re-approval threshold logic (show the concept, skip the automation)
- Mobile layout
