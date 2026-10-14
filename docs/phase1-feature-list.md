# Runway Phase 1 — Assumed Feature List

**Draft SOW exhibit.** No Budget Tool source code is available before the quote. This list is Scale's understanding of what the Budget Tool does today, plus what Runway adds. Phase 1 is priced and accepted against this list. Anything outside it, or any assumption below that proves wrong, goes through a change order.

Sources: AlixPartners' deck and Engagement Tracker documents, the intake conversation, and the design decisions in [product-decisions.md](product-decisions.md). Terms follow [CONTEXT.md](../CONTEXT.md). Items marked *(proposed)* are Scale's guesses, to confirm in the Budget Tool walkthrough.

**Disposition:**
- **Keep:** same behavior as the Budget Tool, rebuilt.
- **Redesign:** same outcome, new way of doing it.
- **New:** not in the Budget Tool today.

## Features

### A. Sign-in and access
| ID | Feature | Disposition |
|---|---|---|
| A1 | Sign-in with Entra ID and Duo. | Keep |
| A2 | Engagement Owners see only Engagements where they are the Lead PMD/Partner. Strategic Finance sees all. Approvers see Budgets submitted to them. Roles are Entra groups. | Keep |
| A3 | Raw Cost Rates are visible only to Strategic Finance; Engagement Owners see margin, not the underlying cost. | Keep *(proposed)* |

### B. Engagements
| ID | Feature | Disposition |
|---|---|---|
| B1 | List and search my Engagements, with Budget status (Draft, Submitted, Approved, Rejected, Modified). | Redesign |
| B2 | Create an Engagement: client, name, Engagement Owner, Engagement type (Fixed Fee or Hourly), fee, **Engagement Dates**, and Period Type (weekly or monthly). | Redesign: Engagement Dates replace "number of periods" |

### C. Building a Budget
| ID | Feature | Disposition |
|---|---|---|
| C1 | Add **Tasks** with a name, estimated hours, a start and a number of Periods. Periods can be removed one by one. Tasks can be reordered. | New |
| C2 | Add **Allocations** to a Task for a named Resource (from master data) or a **Placeholder** for a Resource Category, with hours per Period. | Redesign |
| C3 | Once a Task has Allocations, its estimate is greyed out and replaced by the sum of its Allocations. | New |
| C4 | Each Allocation line shows the Resource's level and standard rate. The engagement rate is editable per line. | Keep *(proposed)* |
| C5 | Allocations with no Task (older Budgets, or rows added in the Budget Tool) appear under the **Catch-all Task**. | New |
| C6 | Hours, fees at standard and fees at engagement rates, totaled by Period, Resource, Task and Budget. | Keep |
| C7 | Staffing-plan layout (Tasks and Resources over time) rather than a spreadsheet grid. Final design comes from 2 UX sessions. | Redesign |

### D. Profitability
| ID | Feature | Disposition |
|---|---|---|
| D1 | Live calculation as the user edits: revenue, margin, margin %, Realization, Staff/PMD hours (leverage), % of hours below Director. | Keep: must match the Budget Tool's results |

### E. Submission, approval and versions
| ID | Feature | Disposition |
|---|---|---|
| E1 | Submit a Budget for Approval. An Approver accepts or rejects it with a comment. The screen may say "Accept". | Keep |
| E2 | Every save is kept. **Checkpoints** are taken at Submitted, Approved and Modified. | New |
| E3 | View a Budget's Checkpoints and compare the current state with the **Baseline**. | New |
| E4 | Modify an approved Budget. Re-approval is required when it crosses the **Re-approval Threshold** (a percentage or a total-hours variance). | New *(limits to confirm)* |
| E5 | Budget status changes are shown in the app. No email or Teams notifications. | Keep *(proposed)* |

### F. Data and integration
| ID | Feature | Disposition |
|---|---|---|
| F1 | Resources, rates and Resource Categories are read from the Budget Tool database, as loaded today by the existing SAP ETL. No new SAP integration. | Keep |
| F2 | Runway writes Budgets to the Budget Tool database in its existing structure, so whatever reads approved Budgets today (including SAP Project creation) keeps working unchanged. | Keep |
| F3 | Runway and the Budget Tool run side by side on the same data during the pilot, with no lock between them. | New |

### G. Output
| ID | Feature | Disposition |
|---|---|---|
| G1 | Export a Budget to Excel in one standard layout. | Keep *(proposed)* |

### H. Non-functional
| ID | Feature | Disposition |
|---|---|---|
| H1 | Desktop browsers supported by the firm. No mobile layout. | Keep |
| H2 | Hosted in AlixPartners' Azure tenant (Dev, UAT, Prod), available 24/7 within Azure's standard service levels. | New |
| H3 | Recalculation feels immediate (under 1 second for a typical Budget). | New *(proposed)* |

## Not included
- Budget vs. Actual, Forecasts and the Ideal Hours Coefficient. These are Phase 2.
- Any change to how the Budget Tool, the SAP ETL, SAP or Intapp behave.
- Daily Period Type, and different Period Types within one Budget.
- Budget Tool screens, reports or workflows not listed above (for example, Budget templates, copying a Budget, bulk import, dashboards, multi-step approval routing).
- Migrating data: Runway uses the existing database, so there is nothing to migrate.
- Email or Teams notifications, mobile layouts, offline use.

## Assumptions
If any of these proves wrong, the affected work is re-scoped through a change order.
1. **Feature coverage:** this list covers the Budget Tool's features that are in use. Items found in the walkthrough beyond it are additions.
2. **Database access:** Runway's Azure environment can reach the Budget Tool database over a private connection. The engine is SQL Server or Azure SQL *(proposed)*.
3. **Schema changes:** Runway may add tables and nullable columns. Doing so doesn't affect the Budget Tool or any other system that uses the database.
4. **Save pattern:** the Budget Tool updates Allocation rows in place rather than deleting and reinserting them. If it reinserts them, keeping Task links during the pilot is extra work.
5. **Master data:** the existing ETL already provides the Resources, rates and Resource Categories Runway needs.
6. **Calculations:** AlixPartners supplies the Budget Tool's calculation rules in writing, plus about 10 sample Engagements with expected results, within 2 weeks of kickoff *(proposed timing)*.
7. **Approval:** approval is a single step by any member of an Approver group.
8. **Periods:** existing Budgets use only weekly or monthly periods.
9. **Environments:** AlixPartners provides the Azure environments, Entra groups and Scale's access within 2 weeks of kickoff *(proposed timing)*.
10. **People:** named Strategic Finance staff, UX session participants, UAT testers and pilot users are available on the agreed schedule.
