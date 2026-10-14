# Client Brief — AlixPartners Budget Tool

Background for the Runway engagement. Terms follow [CONTEXT.md](../CONTEXT.md). Sources (client material is not committed):
- Scale's intake notes (2026-10-08)
- AlixPartners' internal deck *"Engagement Budget vs. Actual Tracking & Forecasting Tool"* (May 2026)
- AlixPartners' *"Engagement Tracker Tool – Business Requirements"* (Word) and *"Engagement Tracker Tool – Mockup"* (Excel), received 2026-10-13

## Client
AlixPartners is a consulting firm whose work centers on restructuring, turnaround and bankruptcy. They sell blocks of consultant hours to clients. Before taking on an Engagement they evaluate its profitability (their "budgetary justification") using the Budget Tool.

Primary contact for technical discovery: **Paul** (AlixPartners).

## Today's process
1. Resources, rates and other factors are held centrally in SAP and reach the Budget Tool's database through a daily ETL.
2. An Engagement Owner uses the Budget Tool (spreadsheet-like screens) to define the Engagement, pick Resources and rates, set length and scope, and see probable profitability.
3. The leadership team approves or rejects the Budget.
4. If approved, SAP creates an SAP Project. Resources record time in Intapp, and the time flows into SAP as Actuals.

The Budget Tool lets the user choose a Period Type (daily, weekly or monthly) and a number of Periods. The screen then grows to the right with one entry box per Period.

## Pain points (from the deck)
- The weekly Excel Engagement Report shows hours and revenue against budget but **no actual or projected margin**. It's refreshed weekly or by hand.
- When an Engagement runs into overage, Strategic Finance is asked ad hoc to calculate margin by hand.
- Margin is only reported systematically at month end (CMR/EMR).

## What AlixPartners wants (from the deck)
- Track and forecast Budget vs. Actual, with estimated margin based on Actuals plus projected hours.
- PMDs and Partners can edit projections for the remaining weeks and adjust staffing.
- KPIs: margin, margin %, leverage, hours below Director, variances.
- Available to PMDs and Partners globally, refreshed in near real time. In practice, Actuals arrive **one day** after they're reported, which is the agreed position.
- Goals: better margin outcomes, more self-service for PMDs and Partners, and less manual work for Strategic Finance.

## What AlixPartners asked Scale for
A dynamic, versioned, easy-to-use website for creating budgets, changing budgets, and tracking Budget vs. Actual. AlixPartners wants it in **two phases**:
- **Phase 1:** modernize the Budget Tool (front end and backend).
- **Phase 2:** Actuals tracking (Budget vs. Actual).

They are a Microsoft shop: it must fit their Azure footprint, with Entra ID and Duo for sign-in.

## Engagement Tracker requirements (received 2026-10-13)
AlixPartners' requirements document and mockup describe the **Budget vs. Actual tracking and forecasting** tool. Scale treats them as the definition of **Phase 2**; the behavior is summarized in [product-decisions.md](product-decisions.md#phase-2-budget-vs-actual-from-the-engagement-tracker-requirements).

**What the documents say:**
- The idea was presented to the Co-CEOs in fall 2025. Further exploration was approved, and they asked for a demo.
- Budget and timeline are "TBD".
- Covers Fixed Fee Engagements only, weekly or monthly.
- Data sources named:
  - the **data lake** (budgeted revenue, timecards)
  - **MDM** (Profit Hurdle percentages)
  - the Budget Tool (Lead PMD/Partner, budget)

**Constraints and risks the client lists:**
- The current Budget Tool and its profitability calculation "should not be modified in any way", because they serve other reporting.
- The month-end Ideal Hours Coefficient must not be affected.
- Strategic Finance availability drops in the fall, as the budget cycle ramps up.
- People without experience of the Budget Tool and the firm's profitability logic would slow the project down.

**Gaps in what was sent:**
- The Employee Standard Cost formula, referenced as section 3.2.1.1.
- The external `Est Margin` workbook that the mockup's margin figures link to.
- The basis for budgeted expenses: the mockup uses 15% of revenue.
- No source code is expected before Scale's quote.
