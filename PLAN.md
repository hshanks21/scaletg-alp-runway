# PLAN.md — Runway Prototype Implementation

> **Goal:** Build a working prototype that demonstrates Budget creation, live profitability, approval workflows, versioning/checkpoints, and Budget vs. Actual — enough to win the AlixPartners deal.

**Stack:** React + Vite + Tailwind + ShadCN (frontend) · Express + TypeScript + Drizzle (backend) · Supabase Postgres (database)

**Design:** Light theme, professional/corporate. Staffing plan layout for Phase 1, data grid for Phase 2 BvA.

**Timeline:** 7 days. Demo is part of the proposal. Deploy on local node-dev server.

**Source material:** Business requirements doc, engagement tracker mockup (xlsx), 407-page database schema (PDF). All in `docs/`.

---

## What We Learned From the Client Documents

### From the Database Schema (sqldb-mdmebt-prod)
- **SQL Server 2019 Enterprise** on Always-On AG — production target is SQL Server, prototype stays on Supabase Postgres
- **`APTBL_BUDGET_HEADER`** (40+ columns) — the budget header stores pre-calculated revenue, margins, realization, leverage, fees, travel
- **`APTBL_BUDGET_DETAIL`** — allocation rows: Timekeeper × Period with hours, fees, fees at standard
- **`EmployeeBudgetPerPeriod`** — the allocation grid (one row per employee per period) — this IS the spreadsheet we're replacing
- **`APSP_Engagement_Budget_Margin_Calc_New`** — 200+ line stored proc that IS the margin calculation engine. We must match its output.
- **`LocationHolidayCalender`** — holiday calendars by office location (critical for Ideal Hours Coefficient)
- **`ProfitHurdle`** — revenue reduction percentages by period
- **`TBDMapping`** — how they handle Placeholder ("TBD") resources
- **`BudgetAccess`** — who sees which budgets (maps to Engagement Owner visibility)
- **No approval workflow table** — approval is new; our workflow is genuinely added value
- **Multi-currency support** — FxRate, CurrencyLookup (prototype ignores, production handles)

### From the Business Requirements
- **Ideal Hours Coefficient** is complex: calculated at Client × Timekeeper × Day level, with holiday exclusions by home office, specific non-billable hour inclusions (5 categories), and a null → 1 safeguard
- **The coefficient must be maintenance-free** — new engagements shouldn't require updating inclusion/exclusion rules
- **Runway's coefficient is SEPARATE** from the month-end coefficient — refreshed weekly vs monthly, never cross-contaminating
- **Employee Standard Cost = Ideal Hours Coefficient × forecast hours × standard hourly cost**
- **Profit Hurdle = Forecasted Revenue × MDM percentage for the period** — deducted before margin
- **"The current budget tool should not be modified in any way"** — Runway is additive, never touches their existing tool

### From the Engagement Tracker Mockup
The mockup defines the exact Budget vs. Actual screen. Key layout:

**Per resource, per period — three sub-rows:**
```
Resource Name  | Title | Region | Rate(Std) | Rate(Eng) | Week 1          | Week 2          | Week 3
                                                         Hours Fees@Std   Hours Fees@Std   Hours Fees@Std
TBD Director   | Dir   | Amer   | $1,115    | $1,051    |
                                              Budget:     8.5   $9,478     8.5   $9,478     8.5   $9,478
                                              Actuals:    0     $0         0     $0         0     $0
                                              Forecast:   0     $0         0     $0         0     $0

Marc Brown     | PMD   | Amer   | $1,465    | $1,381    |
                                              Budget:     2.5   $3,663     2.5   $3,663     2.5   $3,663
                                              Actuals:    3     $4,395     3     $4,395     0     $0
                                              Forecast:   3     $4,395     3     $4,395     2.5   $3,663
```

**KPI panel (Budget vs Forecast vs Variance):**
| KPI | Budget | Forecast | Variance |
|-----|--------|----------|----------|
| Margin % | 14.7% | 12.3% | -2.4% |
| Realization | 94.3% | 94.3% | 0% |
| Staff/PMD Hours | 8.9 | 8.0 | -0.9 |
| % Hrs Below Director | 61.4% | 62.9% | +1.5% |

**Revenue/Cost adjustment panel:**
```
Budgeted Revenue: $60,000  + Revenue Adjustment: $10,000  = Forecasted Revenue: $70,000
  Agreed Base Fees: $60,000                                   (Contingent/Other: $10,000)
Budgeted Expenses: $9,000   + Expense Adjustment: $0       = Forecasted Expenses: $9,000
Budgeted ETS:      $10,000  + ETS Adjustment: $0           = Forecasted ETS: $10,000
  Digital Tools: $10,000
  ETS Costs: $0
```

**Engagement Details Summary (by consultant level):**
| Level | Hours (Actual) | Hours (Budget) | Hours (Forecast) | Variance |
|-------|---------------|----------------|------------------|----------|
| PMD | 6 | 7.5 | 8.5 | +1 |
| Director | 20 | 25.5 | 20 | -5.5 |
| Consultant | 30 | 54.75 | 48.25 | -6.5 |
| **Total** | **56** | **87.75** | **76.75** | **-11** |

**Actions available:**
- ☒ Remove TBD Forecasted Hours (bulk action)
- Per-resource "Remove Fcst Hours" button
- [INSERT NEW EMPLOYEE] — type name, details auto-fill
- "Calculate Metrics" button — explicit recalculation
- Save + Export to Excel

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
- `engagements` — id, client_name, name, engagement_owner, engagement_type (fixed_fee | hourly), total_fee, agreed_base_fees, contingent_fees, start_date, end_date, period_type (weekly | monthly), currency, business_unit, community, country, status (draft | submitted | approved | rejected | modified), expenses_budget, ets_budget, digital_tools_budget, created_at, updated_at
- `resource_categories` — id, name (Partner, PMD, Director, Consultant, TBD), sort_order
- `resources` — id, name, resource_category_id, standard_rate, cost_rate, industry_service_line, region, home_office, is_placeholder (boolean)
- `tasks` — id, engagement_id, name, estimated_hours, start_date, num_periods, sort_order
- `allocations` — id, task_id, resource_id, engagement_rate, placeholder_category_id (nullable)
- `allocation_periods` — id, allocation_id, period_start, period_end, hours
- `checkpoints` — id, engagement_id, kind (submitted | approved | modified), label, snapshot (JSONB), comment, created_by, created_at
- `actuals` — id, engagement_id, resource_id, period_start, period_end, hours
- `forecasts` — id, engagement_id, resource_id, period_start, period_end, hours, created_at, updated_at
- `revenue_adjustments` — id, engagement_id, agreed_base_fees_adj, contingent_fees_adj, expense_adj, digital_tools_adj, ets_costs_adj, created_at, updated_at
- `holiday_calendars` — id, location, holiday_date, description (for Ideal Hours demo)
- `profit_hurdle` — id, period_start, period_end, percentage

**Indexes:** engagement_id on tasks, allocations, checkpoints, actuals, forecasts, revenue_adjustments. resource_id on allocations, actuals, forecasts.

### 1.3 — Seed sample data
Create seed script with 3 demo Engagements:
1. **Project Phoenix** — Fixed Fee, $2.5M, 6 months (monthly), 3 Tasks, 8 Resources, Approved with Actuals for first 3 months. Shows margin declining from 25% to 18% — the "we need to reforecast" story.
2. **Operation Atlas** — Fixed Fee, $1.2M, 3 months (weekly), Draft, being built. Shows the budgeting workflow.
3. **Meridian Advisory** — Fixed Fee, $4M, 12 months (monthly), Approved, Budget vs. Actual with 6 months of Actuals + 6 months of Forecast. Includes revenue adjustments (contingent fees added) and a TBD Placeholder.

Seed 15-20 Resources across 4 categories with realistic rates:
| Category | Standard Rate Range | Engagement Rate Range |
|----------|--------------------|-----------------------|
| Partner/PMD | $1,200–$1,500/hr | $1,100–$1,400/hr |
| Director | $900–$1,200/hr | $850–$1,100/hr |
| Consultant (SVP/VP) | $500–$800/hr | $450–$750/hr |
| Consultant (Associate) | $300–$500/hr | $275–$450/hr |

Seed a sample `profit_hurdle` table with quarterly percentages.
Seed a sample `holiday_calendars` for Americas (US federal holidays).

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
| `/api/engagements/:id/kpis` | GET | Calculate live KPIs |
| `/api/engagements/:id/budget-vs-actual` | GET | Budget vs. Actual with Forecasts |
| `/api/engagements/:id/forecasts` | PATCH | Update forecast hours per resource/period |
| `/api/engagements/:id/forecasts/remove-tbd` | POST | Remove all TBD placeholder forecasts |
| `/api/engagements/:id/forecasts/remove-resource/:resId` | POST | Remove forecasts for one resource |
| `/api/engagements/:id/adjustments` | GET/PATCH | Revenue/expense/ETS adjustments |
| `/api/resources` | GET | List resources (with category filter, search) |

### 1.5 — Profitability calculation engine
Backend service (`calculationEngine.ts`) that computes all KPIs:

**Phase 1 (Budget) calculations:**
- Revenue = Σ (allocation_hours × engagement_rate) per Resource
- Fees at Standard = Σ (allocation_hours × standard_rate) per Resource
- Realization = Revenue ÷ Fees at Standard
- Leverage (Staff/PMD Hours) = hours(Director + Consultant) ÷ hours(Partner + PMD)
- % Hours Below Director = hours(Consultant) ÷ total_hours
- Margin = Revenue - Cost (simplified for Phase 1 prototype)
- Margin % = Margin ÷ Revenue

**Phase 2 (Budget vs. Actual) calculations — matching the mockup exactly:**
- Forecasted Revenue = Budgeted Revenue + Revenue Adjustments (Agreed Base Fees + Contingent/Other Fees)
- Forecasted Expenses = Budgeted Expenses + Expense Adjustments
- Forecasted ETS Costs = Budgeted ETS + ETS Adjustments (Digital Tools + ETS Costs)
- Standard Cost per Resource = Ideal Hours Coefficient × forecast hours × standard hourly cost
- Profit Hurdle = Forecasted Revenue × MDM percentage for the period
- Estimated Margin = Forecasted Revenue − Standard Costs − Forecasted Expenses − Forecasted ETS Costs − Profit Hurdle
- Estimated Margin % = Estimated Margin ÷ Forecasted Revenue

**Ideal Hours Coefficient (simplified for prototype):**
- For the prototype: seed a coefficient value per resource (e.g. 0.85–0.95) rather than calculating from timecards
- Document that production will calculate it from the Client × Timekeeper × Day formula with holiday exclusions
- Default to 1 when coefficient is null (matching their safeguard)

Must recalculate on every edit and return in <100ms.

---

## Phase 2: Frontend — Engagement List + Budget Editor

### 2.1 — App shell + routing
- Light theme AppLayout with sidebar navigation
- Routes: `/engagements`, `/engagements/:id`, `/engagements/:id/budget-vs-actual`
- Supabase Auth (magic link) — simple login page

### 2.2 — Engagement list page
- Table with: name, client, owner, status badge, fee, dates, period count
- Status filter tabs: All, Draft, Submitted, Approved
- Create Engagement button → modal/drawer with form fields:
  - Client name, engagement name, engagement owner
  - Engagement type (Fixed Fee only for prototype)
  - Agreed Base Fees, Contingent/Other Fees
  - Start date, end date, period type (weekly | monthly)
  - Budgeted expenses, ETS costs, digital tools
- Click row → navigate to Budget editor

### 2.3 — Budget editor (the hero screen)
**This is the screen that wins the deal.** NOT a spreadsheet — a staffing plan.

Layout concept — staffing plan / timeline:
```
┌─────────────────────────────────────────────────────────────┐
│ Project Phoenix · $2.5M Fixed Fee · Jan–Jun 2027            │
│ Status: Approved · Margin: $625K (25.0%) · 🟢              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ KPI Panel (always visible) ─────────────────────────────┐│
│ │ Revenue    Fees@Std   Margin    M%     Realiz.  Leverage ││
│ │ $2.50M     $2.71M     $625K    25.0%   92.3%    3.2x    ││
│ │                                                          ││
│ │ % Below Director: 61.4%                                  ││
│ └──────────────────────────────────────────────────────────┘│
│                                                             │
│ ┌─ Tasks ──────────────────────────────────────────────────┐│
│ │                    Jan    Feb    Mar    Apr    May    Jun ││
│ │ ▼ Due Diligence (est: 800h → alloc: 820h)               ││
│ │   J. Smith (PMD)    40     40     40     40     —      — ││
│ │     Rate: $1,465 std / $1,381 eng                        ││
│ │   A. Chen (Dir)     80     80     80     80     80    80 ││
│ │     Rate: $1,030 std / $971 eng                          ││
│ │   + Add Resource                                         ││
│ │                                                          ││
│ │ ▼ Financial Analysis (est: 600h → alloc: 580h)           ││
│ │   M. Park (Cons)    60     60     60     60     60    60 ││
│ │   TBD Consultant    40     40     40     —      —     —  ││
│ │   + Add Resource                                         ││
│ │                                                          ││
│ │ + Add Task                                               ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

Key interactions:
- Click a cell to edit hours → KPIs recalculate live
- Add Task → name + estimated hours + start + number of periods
- Add Resource to Task → search/pick from master list or add Placeholder (TBD)
- Engagement rate editable per allocation line (std rate pre-fills)
- Expand/collapse Tasks
- Period columns auto-generate from Engagement Dates + Period Type
- Periods cut short at Engagement start/end dates

### 2.4 — Live KPI panel
- Sticky panel that updates on every allocation change
- KPIs (matching the mockup):
  - Revenue, Fees at Standard, Margin ($), Margin %
  - Realization (Revenue ÷ Fees@Std)
  - Staff/PMD Hours (leverage ratio)
  - % Hours Below Director
- Green/red indicators for positive/negative margin
- Recalculates client-side from the allocation data (backend confirms on save)

---

## Phase 3: Approval Workflow + Versioning

### 3.1 — Status transitions + approval UI
- Submit button (Draft → Submitted) with confirmation
- Approval view: Approver sees submitted Budgets, can Approve or Reject with comment
- Status badge updates throughout the UI (Draft, Submitted, Approved, Rejected, Modified)
- Rejection returns to Draft with the comment visible
- Modified state when an approved Budget is edited

### 3.2 — Checkpoints + Baseline comparison
- Every submit/approve/modify creates a Checkpoint (JSONB snapshot of the full Budget state)
- Checkpoint list in a sidebar panel on the Budget editor
- "Compare with Baseline" view: side-by-side diff highlighting what changed (hours, rates, resources added/removed)
- Baseline = most recent Approved checkpoint
- Visual: green for additions, red for removals, amber for changes

---

## Phase 4: Budget vs. Actual

### 4.1 — BvA data grid (matching the mockup layout)
New tab on approved Engagements: "Budget vs. Actual"

**Grid layout — Resource × Period with 3 sub-rows:**
```
┌────────────────────────────────────────────────────────────────────┐
│ Engagement Details Summary                                         │
│ ┌──────────┬─────────┬──────────┬──────────┬──────────┐           │
│ │ Level    │ Actual  │ Budget   │ Forecast │ Variance │           │
│ │ PMD      │ 6       │ 7.5      │ 8.5      │ +1       │           │
│ │ Director │ 20      │ 25.5     │ 20       │ -5.5     │           │
│ │ Consult  │ 30      │ 54.75    │ 48.25    │ -6.5     │           │
│ │ Total    │ 56      │ 87.75    │ 76.75    │ -11      │           │
│ └──────────┴─────────┴──────────┴──────────┴──────────┘           │
├────────────────────────────────────────────────────────────────────┤
│ Resource          Title   Region Rate  Rate   Week 1    Week 2    │
│                                  (std) (eng)  Hrs  Fee  Hrs  Fee  │
│ ─────────────────────────────────────────────────────────────────  │
│ Marc Brown        PMD    Amer  $1465 $1381                        │
│   Budget:                              2.5  $3,663  2.5  $3,663  │
│   Actuals:                             3.0  $4,395  3.0  $4,395  │
│   Forecast:                            3.0  $4,395  3.0  $4,395  │
│                                                                    │
│ TBD Director      Dir    Amer  $1115 $1051                        │
│   Budget:                              8.5  $9,478  8.5  $9,478  │
│   Actuals:                             0    $0      0    $0      │
│   Forecast:                            0    $0      0    $0      │
│                                                                    │
│ [INSERT NEW EMPLOYEE]                                              │
│                                                                    │
│ ☒ Remove TBD Forecasted Hours                                     │
├────────────────────────────────────────────────────────────────────┤
│ Revenue / Cost Adjustments                                         │
│ Budgeted Revenue: $60K + Adj: $10K = Forecasted: $70K             │
│   Agreed Base Fees: $60K    Contingent/Other: $10K                 │
│ Budgeted Expenses: $9K  + Adj: $0  = Forecasted: $9K              │
│ Budgeted ETS:      $10K + Adj: $0  = Forecasted: $10K             │
│   Digital Tools: $10K       ETS Costs: $0                          │
├────────────────────────────────────────────────────────────────────┤
│ KPIs: Budget | Forecast | Variance                                 │
│ Margin %:        14.7%  |  12.3%   | -2.4%                        │
│ Realization:     94.3%  |  94.3%   |  0%                           │
│ Staff/PMD Hrs:   8.9    |  8.0     | -0.9                          │
│ % Below Dir:     61.4%  |  62.9%   | +1.5%                         │
├────────────────────────────────────────────────────────────────────┤
│ [Calculate Metrics]  [Save]  [Export to Excel]                     │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 — Forecast editing
- Click any Forecast hours cell to edit → fees recalculate automatically
- Past periods: Forecast defaults to Actuals (editable but highlighted as override)
- Future periods: Forecast defaults to Budget (editable)
- ☒ "Remove TBD Forecasted Hours" — zeroes all forecasts for Placeholder resources
- Per-resource "Remove Fcst Hours" button — zeroes that resource's forecasts
- [INSERT NEW EMPLOYEE] — type name, auto-fill title/rates/region from master data, then edit forecast hours
- "Calculate Metrics" button — explicit full recalculation
- Save persists all forecast edits (every save is kept)

### 4.3 — Revenue/Cost adjustment panel
Editable fields (yellow in the mockup):
- Revenue Adjustments: Agreed Base Fees adj, Contingent/Other Fees adj
- Expense Adjustments
- ETS Cost Adjustments: Digital Tools adj, ETS Costs adj

All feed into the Estimated Margin calculation:
```
Estimated Margin = Forecasted Revenue
                 − Standard Costs (Σ coefficient × forecast_hours × std_hourly_cost per resource)
                 − Forecasted Expenses
                 − Forecasted ETS Costs
                 − Profit Hurdle (Forecasted Revenue × period %)
```

### 4.4 — BvA KPI panel
Four KPIs shown as Budget | Forecast | Variance:
1. **Margin %** — Estimated Margin ÷ Forecasted Revenue
2. **Realization** — Revenue at engagement rates ÷ Revenue at standard rates
3. **Staff/PMD Hours** — hours(Director + Consultant) ÷ hours(PMD) — leverage ratio
4. **% Hours Below Director** — hours(Consultant) ÷ total_hours

Variance color coding:
- Green: forecast better than budget
- Red: forecast worse than budget
- Neutral: within ±1%

---

## Delivery Order

```
Day 1:   Phase 1 (Foundation)     → 1.1 scaffolding → 1.2 schema → 1.3 seed data
Day 2-3: Phase 1 cont + Phase 2  → 1.4 API routes → 1.5 calc engine → 2.1 app shell → 2.2 list
Day 3-4: Phase 2 (Hero screen)   → 2.3 Budget editor → 2.4 KPI panel
Day 5:   Phase 3 (Approval)      → 3.1 status transitions → 3.2 checkpoints
Day 6:   Phase 4 (BvA)           → 4.1 grid → 4.2 forecast editing → 4.3 adjustments → 4.4 KPIs
Day 7:   Polish + Demo prep      → Sample data tuning, walkthrough script, edge cases
```

**Critical path:** 1.2 (schema) → 1.4 (API) → 1.5 (calc engine) → 2.3 (Budget editor) → 4.1 (BvA grid)

The Budget editor (2.3) is the screen that wins Phase 1. The BvA grid (4.1) is the screen that wins Phase 2. Both must be polished for the demo.

---

## What We Skip in the Prototype

| Skip | Why | Production handles it |
|------|-----|----------------------|
| Entra ID / Duo auth | Use Supabase magic link | MSAL integration |
| SAP ETL integration | Seed sample data | Connect to their data lake |
| Real Ideal Hours Coefficient calculation | Seed coefficients per resource | Client × TK × Day formula with holidays |
| Multi-currency | All in USD | FxRate table + conversion |
| Excel export | Show the data, skip the export | Phase 2 deliverable |
| Coexistence with Budget Tool | Separate database | ADR 0001 same-database |
| Re-approval threshold automation | Show the concept manually | Configurable threshold |
| Mobile layout | Desktop only | Desktop only (client requirement) |
| Holiday calendar computation | Seed holidays | LocationHolidayCalender integration |
| Subcontractor handling | Skip SUBCON tables | APTBL_BUDGET_SUBCON integration |

---

## Resolved Questions
- **Supabase project:** Create new (keep it clean from Fulcrum)
- **Deployment:** Local node-dev server
- **Timeline:** 7 days — demo is part of the proposal
- **"Don't touch the Budget Tool":** Understood — Runway is additive, separate calculations, separate coefficient instance
