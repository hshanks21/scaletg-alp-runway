# AlixPartners Engagement Budgeting

How AlixPartners plans the staffing and profitability of client work before it is approved, and tracks actual results against that plan afterwards.

## Language

### Work

**Engagement**:
A piece of client work that AlixPartners budgets, approves, staffs and tracks; it exists before approval.
_Avoid_: Project, job, matter

**Fixed Fee Engagement**:
An Engagement billed at an agreed fee rather than by the hour; the only kind Budget vs. Actual covers.
_Avoid_: Fixed bid, flat fee

**Budget**:
The plan of work, hours and fees for an Engagement, used to judge its probable profitability before approval.
_Avoid_: Estimate, forecast, plan

**Task**:
A unit of planned work within a Budget, defined by a start and a number of Periods, that helps the Engagement Owner think the work through. Its estimated hours stand until Allocations are added, after which its hours are the sum of its Allocations. Tasks belong to budgeting only and play no part in Budget vs. Actual.
_Avoid_: Workstream, activity, phase, line item

**Catch-all Task**:
The Task that holds every Allocation not tied to a Task, such as those from before Runway or those added in the Budget Tool.
_Avoid_: Default task, misc, unassigned bucket

**Engagement Dates**:
The start and end of an Engagement, within which all of its Allocations fall.
_Avoid_: Duration, number of periods, term

**Period Type**:
The unit of time a Budget's hours are entered and tracked in: weekly or monthly, set once per Budget.
_Avoid_: Granularity, interval, frequency

**Period**:
One calendar week or month of a Budget into which hours are entered, cut short at either end to fit the Engagement Dates; individual Periods can be removed from a Task.
_Avoid_: Bucket, box, column, slot

**Allocation**:
Hours of a Resource or Placeholder committed to a Task over a period of time.
_Avoid_: Assignment, staffing, utilization, booking

**Approval**:
The leadership team's acceptance of a Budget, which makes it the Baseline; Runway's screens may label the action "Accept".
_Avoid_: Sign-off, release

**Checkpoint**:
A named, frozen state of a Budget, taken at Submitted, Approved or Modified; every other save is history only.
_Avoid_: Version, snapshot, revision

**Re-approval Threshold**:
A limit on how far a Modified Budget may move from its Baseline, as a percentage variance or a total-hours variance, before it must be approved again; crossing either one triggers it.
_Avoid_: Tolerance, trigger, variance limit

**Baseline**:
The Checkpoint a Budget is currently measured against, normally its most recent Approval.
_Avoid_: Original budget, approved version

**SAP Project**:
The record SAP creates for an Engagement once it is approved; one per approved Engagement.
_Avoid_: Project ID (on its own), project

**Budget Tool**:
AlixPartners' existing application for building and approving budgets; the system Phase 1 modernizes.
_Avoid_: Legacy app, old tool, spreadsheet

**Runway**:
Scale's name for the whole engagement: the modernized replacement for the Budget Tool (Phase 1), sharing its data while both are in use, extended with Budget vs. Actual (Phase 2). AlixPartners calls the Phase 2 part the "Engagement Tracker Tool".
_Avoid_: New tool, new budget tool, the website

### People

**PMD**:
Partner & Managing Director — AlixPartners' most senior practitioner title.
_Avoid_: Project Management Director

**Engagement Owner**:
The person accountable for an Engagement's Budget, usually a PMD or Partner; the client's documents call them the Lead PMD/Partner.
_Avoid_: PM, project manager, owner

**Strategic Finance**:
AlixPartners' finance team that owns the profitability logic and may see every Engagement.
_Avoid_: Finance, FP&A

**Resource**:
A person who can be staffed on an Engagement and whose time is budgeted and tracked; Resources are not users of the Budget Tool.
_Avoid_: Consultant, staff, employee, participant, timekeeper

**Placeholder**:
An unnamed stand-in for a Resource of a given Resource Category, used in an Allocation until a named Resource is staffed.
_Avoid_: TBD resource, generic resource, dummy

**Resource Category**:
One of roughly five groupings every Resource falls into, used for budgeting rates and staffing mix.
_Avoid_: Archetype, level, grade, tier

### Tracking

**Actuals**:
Hours actually recorded by Resources against an SAP Project, available one day after they are reported, and compared with the Budget by Resource and Period.
_Avoid_: Time, timesheets, incurred

**Forecast**:
The hours a Resource is now expected to work in the remaining Periods of an approved Engagement; past Periods show Actuals, future Periods start from the Budget.
_Avoid_: Projection, re-budget, estimate

**Adjustment**:
An Engagement Owner's change to budgeted revenue, expenses or ETS costs, used to work out Forecasted Revenue and Estimated Margin.
_Avoid_: Override, correction

**Ideal Hours Coefficient**:
The ratio of a Resource's yearly Ideal Hours to yearly hours worked for a client, used to scale forecast hours into standard cost; calculated for Runway alone and separate from the month-end figure.
_Avoid_: Utilization, efficiency factor

**Estimated Margin**:
Forecasted Revenue less standard costs, expenses, ETS costs and the Profit Hurdle.
_Avoid_: Profit, margin (on its own)

**Profit Hurdle**:
The share of Forecasted Revenue, set per period in MDM, that is deducted before Estimated Margin.
_Avoid_: Overhead, target margin

**Realization**:
Budgeted fees divided by fees at standard rates for the same hours.
_Avoid_: Discount, recovery

**Utilization**:
The firm's KPI of billable hours divided by available hours for a Resource; never used to mean Allocation.
_Avoid_: Using it for planned hours

**Budget vs. Actual**:
The comparison of an approved Fixed Fee Engagement's Budget with its Actuals and Forecast, including Estimated Margin.
_Avoid_: BvA, variance report, tracking
