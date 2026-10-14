# Product Decisions — Runway

How Runway behaves, and why. Agreed in the 2026-10-08 design session and revised on 2026-10-13 after AlixPartners' Engagement Tracker requirements. Terms follow [CONTEXT.md](../CONTEXT.md); larger architectural choices are ADRs in [decisions/](decisions/). Items marked *(proposed)* are recommendations not yet explicitly confirmed. Items marked *(confirm with client)* are Scale's position, pending AlixPartners.

## Phases
- **Phase 1:** modernize the Budget Tool's front end and backend and make it easier to use, changing the data structure as little as possible.
- **Phase 2:** map Actuals onto the Budget for oversight (Budget vs. Actual). AlixPartners' *Engagement Tracker Tool* requirements and mockup define it (see [client-brief.md](client-brief.md)).

## Users and access
- Users: **Engagement Owners** (PMDs/Partners), **Strategic Finance**, and **Approvers** (the leadership team). Approver is a role, modeled as an Entra group.
- Resources (about 5 Resource Categories) are **data only** and never log in *(proposed; not explicitly confirmed)*.
- Engagement Owners see only Engagements where they are the Lead PMD/Partner on the Budget, including their margin. Strategic Finance sees every Engagement. Raw Cost Rates are visible only to Strategic Finance.
- *(proposed)* Cost Rates are held by Resource Category and region, not per person.
- Desktop browsers supported by the firm; no mobile layout. Available 24/7.

## Phase 1: building a Budget (Task → Resource → Hours)
- A Budget is built **Tasks first**, then Resources are added to absorb each Task's hours. Tasks help the Engagement Owner think the work through.
- Tasks matter **only while budgeting**. Validation, reporting and Budget vs. Actual work from Allocations by Resource and Period, not by Task.
- A Task starts with **estimated hours**. Once Allocations are added, the estimate is kept but **greyed out and replaced** by the sum of the Allocations. Margin is always calculated from Allocations × rates.
- Allocations go to a **named Resource** (most of the time) or a **Placeholder** for a Resource Category.

## Time: Periods
- An Engagement has **Engagement Dates** (start and end) instead of the Budget Tool's "number of periods" setting.
- Each Budget has **one Period Type, weekly or monthly**. Daily and per-Task Period Types were dropped to reduce scope. *(Confirm with client that no Budgets use daily periods today.)*
- When a Task is created, the user gives its start and a **number of Periods**, which creates that many Periods under the Task. Periods are an input shortcut and can be removed one by one.
- Periods follow the calendar (calendar months and weeks), and Periods at either end are cut to fit the Engagement Dates.
- Because the Budget has a single Period Type, Runway writes Allocations into the Budget Tool's allocation table in that Period Type, with no splitting. *(Depends on the schema.)*

## Versions and approval
- **Every save is kept** as history.
- Approval stays in scope. The screen may say **"Accept"** rather than "Approve".
- **Checkpoints** are taken at **Submitted**, **Approved** and **Modified**, with pointers to the **Baseline** (normally the latest Approval) and the **current** state.
- A Modified Budget needs re-approval when it crosses a **Re-approval Threshold**. We'll propose a **percentage variance or a total-hours variance**, whichever is crossed first *(confirm with client: the limits, who sets them, and whether it's in Phase 1)*.

## Running alongside the Budget Tool
- New **tasks table**, plus a new nullable **task column on the existing allocation table**, which the Budget Tool ignores ([ADR 0001](decisions/0001-reuse-budget-tool-database-in-place.md)). New columns are allowed as long as they don't change how current software behaves.
- The Budget Tool is **not changed** and has no concept of Tasks. Allocations it adds, and all Budgets from before Runway, land in the **Catch-all Task**. There's no lock between the two tools.

## Phase 2: Budget vs. Actual (from the Engagement Tracker requirements)
- Covers **Fixed Fee Engagements** only, weekly or monthly. Hourly Budget Engagements are out of scope.
- Actuals arrive **one day** after time is reported and refresh at least daily.
- Actuals are compared with the Budget **by Resource and Period**. Tasks play no part.
- For each Resource and Period the screen shows Budget, Actuals and **Forecast**. Past Periods default the Forecast to Actuals; future Periods default it to the Budget.
- The Engagement Owner can edit:
  - Forecast hours for any Resource
  - **Adjustments** to revenue (agreed base fees, contingent/other fees), expenses, and ETS costs (digital tools, ETS costs)
- Shortcuts: remove all Forecast hours for Placeholders ("TBD") in one action, or for one Resource. Add a Resource by name; their level and rates fill in, and their Forecast is then editable.
- Metrics recalculate live. A "Calculate metrics" action stays as an explicit refresh *(proposed)*. Forecasts are saved, and every save is kept.
- Export to Excel, including the metrics.
- Calculations:
  - Forecasted Revenue = budgeted revenue (from the data lake) + revenue Adjustments.
  - Estimated Margin = Forecasted Revenue − standard costs − forecasted expenses − forecasted ETS costs − Profit Hurdle.
  - Standard cost per Resource = **Ideal Hours Coefficient** × forecast hours × standard hourly cost. If there's no coefficient, it defaults to 1 and the Budget Tool's logic is used.
  - Profit Hurdle = Forecasted Revenue × the MDM percentage for the period.
  - Estimated Margin % = Estimated Margin ÷ Forecasted Revenue.
  - KPIs shown as Budget, Forecast and Variance: margin %, **Realization**, Staff/PMD hours, % of hours below Director.
- Runway calculates the Ideal Hours Coefficient itself, refreshed at least weekly ([ADR 0004](decisions/0004-runway-computes-ideal-hours-coefficient.md)). The month-end coefficient is not touched.

## UX direction
- No spreadsheet look in Phase 1. The leading idea is a **staffing plan / timeline**: Tasks with Resources as rows over time, plus a live margin panel. The final design comes from the 2 UX sessions, and the SOW should not commit to a specific design.
- Phase 2's mockup is a spreadsheet layout. Treat it as the definition of the data and calculations, not of the final screen design *(proposed)*.

## Open questions
These are mostly facts; see [discovery-agenda.md](discovery-agenda.md).
- Backend language (.NET vs. TypeScript): depends on who maintains the code after handover. To discuss with Paul.
- Database engine and location, and whether Runway can reach it, which decides ADR 0001's fallback before signing.
- How the old allocation table stores data, and whether the old tool saves by delete-and-reinsert.
- Whether any Budgets use daily periods today.
- The five Resource Categories and how their rates are set.
- Re-approval Threshold values, owner, and Phase 1 inclusion.
- Phase 2 data: the data lake views (budgeted revenue, timecards for all clients), MDM's Profit Hurdle table, holiday calendars by home office, and the Matter attributes the coefficient rules need.
- Phase 2 gaps in the client's documents: the Employee Standard Cost formula ("section 3.2.1.1"), the external `Est Margin` workbook the mockup links to, and whether budgeted expenses at 15% of revenue is a rule or a placeholder.
