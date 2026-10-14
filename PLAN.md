# PLAN.md — Runway Prototype Implementation

> **Goal:** Build a working prototype that demonstrates Budget creation, live profitability, approval workflows, versioning/checkpoints, and Budget vs. Actual — enough to win the AlixPartners deal.

**Stack:** React + Vite + Tailwind + ShadCN (frontend) · Express + TypeScript + Drizzle (backend) · Supabase Postgres (database)

**Design:** Light theme, professional/corporate. Staffing plan layout, NOT a spreadsheet.

---

## Phase 1: Foundation (Backend + Database)

### 1.1 — Project scaffolding
- Initialize pnpm monorepo with `frontend/` and `backend/` packages
- Frontend: Vite + React + TypeScript + Tailwind + ShadCN
- Backend: Express + TypeScript + Drizzle ORM + Supabase
- Shared types package or barrel export
- `.env.example` with Supabase credentials

### 1.2 — Database schema + migrations
Create all tables via Drizzle migrations:

**Core tables:**
- `engagements` — id, client_name, name, engagement_owner, engagement_type (fixed_fee | hourly), total_fee, start_date, end_date, period_type (weekly | monthly), status (draft | submitted | approved | rejected | modified), created_at, updated_at
- `resource_categories` — id, name (Partner, PMD, SVP, VP, Associate), sort_order
- `resources` — id, name, resource_category_id, cost_rate, standard_rate, region
- `tasks` — id, engagement_id, name, estimated_hours, start_date, num_periods, sort_order
- `allocations` — id, task_id, resource_id, engagement_rate, placeholder_category_id (nullable, for Placeholders)
- `allocation_periods` — id, allocation_id, period_start, period_end, hours
- `checkpoints` — id, engagement_id, kind (submitted | approved | modified), label, snapshot (JSONB — full Budget state), comment, created_by, created_at
- `actuals` — id, engagement_id, resource_id, period_start, period_end, hours
- `forecasts` — id, engagement_id, resource_id, period_start, period_end, hours, created_at

**Indexes:** engagement_id on tasks, allocations, checkpoints, actuals, forecasts. resource_id on allocations, actuals, forecasts.

### 1.3 — Seed sample data
Create seed script with 3 demo Engagements:
1. **Project Phoenix** — Fixed Fee, $2.5M, 6 months, 3 Tasks, 8 Resources, Approved with Actuals
2. **Operation Atlas** — Fixed Fee, $1.2M, 3 months, Draft, being built
3. **Meridian Advisory** — Fixed Fee, $4M, 12 months, Approved, Budget vs. Actual with variances

Seed 15-20 Resources across 5 categories with realistic rates.

### 1.4 — Backend API routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/engagements` | GET | List engagements (with status filter) |
| `/api/engagements` | POST | Create engagement |
| `/api/engagements/:id` | GET | Get engagement with tasks, allocations, KPIs |
| `/api/engagements/:id` | PATCH | Update engagement |
| `/api/engagements/:id/tasks` | POST | Add task |
| `/api/engagements/:id/tasks/:taskId` | PATCH/DELETE | Update/remove task |
| `/api/engagements/:id/allocations` | POST | Add allocation (Resource to Task) |
| `/api/engagements/:id/allocations/:allocId` | PATCH/DELETE | Update/remove allocation |
| `/api/engagements/:id/allocations/:allocId/periods` | PATCH | Bulk update period hours |
| `/api/engagements/:id/submit` | POST | Submit for approval |
| `/api/engagements/:id/approve` | POST | Approve (creates Checkpoint + Baseline) |
| `/api/engagements/:id/reject` | POST | Reject with comment |
| `/api/engagements/:id/checkpoints` | GET | List checkpoints |
| `/api/engagements/:id/checkpoints/:cpId` | GET | Get checkpoint snapshot |
| `/api/engagements/:id/kpis` | GET | Calculate live KPIs (margin, realization, leverage) |
| `/api/engagements/:id/budget-vs-actual` | GET | Budget vs. Actual comparison |
| `/api/engagements/:id/forecasts` | PATCH | Update forecast hours |
| `/api/resources` | GET | List resources (with category filter) |

### 1.5 — Profitability calculation engine
Backend service that computes KPIs from allocations + rates:
- Revenue = Σ (allocation_hours × engagement_rate) per Resource
- Cost = Σ (allocation_hours × cost_rate) per Resource
- Margin = Revenue - Cost
- Margin % = Margin ÷ Revenue
- Realization = engagement_fees ÷ standard_rate_fees
- Leverage = hours(VP + Associate) ÷ hours(Partner + PMD)
- % hours below Director = hours(SVP + VP + Associate) ÷ total_hours

Must recalculate on every allocation change and return in <100ms.

---

## Phase 2: Frontend — Engagement List + Budget Editor

### 2.1 — App shell + routing
- Light theme AppLayout with sidebar navigation
- Routes: `/engagements`, `/engagements/:id`, `/engagements/:id/budget-vs-actual`
- Supabase Auth (magic link) — simple login page

### 2.2 — Engagement list page
- Table with: name, client, owner, status badge, fee, dates, period count
- Status filter tabs: All, Draft, Submitted, Approved
- Create Engagement button → modal/drawer with form
- Click row → navigate to Budget editor

### 2.3 — Budget editor (the hero screen)
**This is the screen that wins the deal.** NOT a spreadsheet.

Layout concept — staffing plan / timeline:
```
┌─────────────────────────────────────────────────────────────┐
│ Project Phoenix · $2.5M Fixed Fee · Jan–Jun 2027            │
│ Status: Approved · Margin: $625K (25.0%) · 🟢              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ KPI Panel (always visible) ─────────────────────────────┐│
│ │ Revenue    Cost      Margin    Margin%   Realiz.  Lever. ││
│ │ $2.50M     $1.875M   $625K     25.0%     92.3%    3.2x  ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ Tasks ──────────────────────────────────────────────────┐│
│ │                    Jan    Feb    Mar    Apr    May    Jun ││
│ │ ▼ Due Diligence (est: 800h → alloc: 820h)               ││
│ │   J. Smith (PMD)    40     40     40     40     —      — ││
│ │   A. Chen (VP)      80     80     80     80     80    80 ││
│ │   + Add Resource                                         ││
│ │                                                          ││
│ │ ▼ Financial Analysis (est: 600h → alloc: 580h)           ││
│ │   M. Park (SVP)     60     60     60     60     60    60 ││
│ │   + Add Resource                                         ││
│ │                                                          ││
│ │ + Add Task                                               ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

Key interactions:
- Click a cell to edit hours → KPIs recalculate live
- Add Task → name + estimated hours
- Add Resource to Task → search/pick from master list or add Placeholder
- Engagement rate editable per allocation line
- Expand/collapse Tasks
- Period columns auto-generate from Engagement Dates + Period Type

### 2.4 — Live KPI panel
- Sticky panel that updates on every allocation change
- Revenue, Cost, Margin ($), Margin %, Realization, Leverage, % below Director
- Green/red indicators for positive/negative margin
- Recalculates client-side from the allocation data (backend confirms on save)

---

## Phase 3: Approval Workflow + Versioning

### 3.1 — Status transitions + approval UI
- Submit button (Draft → Submitted) with confirmation
- Approval view: Approver sees submitted Budgets, can Approve or Reject with comment
- Status badge updates throughout the UI
- Rejection returns to Draft with the comment visible

### 3.2 — Checkpoints + Baseline comparison
- Every submit/approve/modify creates a Checkpoint (JSONB snapshot of the full Budget state)
- Checkpoint list in a sidebar panel on the Budget editor
- "Compare with Baseline" view: side-by-side or diff highlighting what changed
- Baseline = most recent Approved checkpoint

---

## Phase 4: Budget vs. Actual

### 4.1 — Actuals + Forecast view
- New tab/view on approved Engagements: "Budget vs. Actual"
- Table: Resource rows × Period columns
- Each cell shows: Budget hours | Actual hours | Forecast hours
- Past periods: Forecast defaults to Actuals
- Future periods: Forecast defaults to Budget, editable
- Color coding: over budget (red), under budget (green), on track (neutral)

### 4.2 — Forecast editing
- Click Forecast cell to edit hours
- "Remove all Placeholder forecasts" bulk action
- Add a Resource mid-engagement (their rates auto-fill)
- Save forecasts → recalculate KPIs

### 4.3 — Budget vs. Actual KPIs
- Same KPI panel but showing: Budget | Forecast | Variance
- Estimated Margin based on Forecast
- Variance highlighting (±10% = amber, ±20% = red)

---

## Delivery Order

```
Phase 1 (Foundation)     → 1.1 → 1.2 → 1.3 → 1.4 → 1.5
Phase 2 (Frontend core)  → 2.1 → 2.2 → 2.3 → 2.4
Phase 3 (Approval + Ver) → 3.1 → 3.2
Phase 4 (BvA)            → 4.1 → 4.2 → 4.3
```

**Critical path:** 1.2 (schema) → 1.4 (API) → 2.3 (Budget editor) — this is the demo that wins the deal.

---

## Open Questions
- Supabase project: create new or use existing?
- Deploy the prototype anywhere (Vercel/Render) or run locally for the demo?
- How much time do we have before the demo?
