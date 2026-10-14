# 0004. Runway computes the Ideal Hours Coefficient from client-supplied timecard data

- Status: Accepted
- Date: 2026-10-13

## Context
Phase 2's Estimated Margin scales each Resource's forecast hours by an **Ideal Hours Coefficient** (AlixPartners' *Engagement Tracker Tool* requirements). The coefficient is calculated per Client × Timekeeper × Day and summed per year. The rules turn on:
- whether the Timekeeper is an MD
- business days, judged against the holiday calendar of each Timekeeper's home office
- 10-hour and 4-hour thresholds
- which non-billable categories count, a rule that must need no maintenance
- an adjustment that sets the coefficient to 1 for FAS-community Matters billed hourly or by unit

It needs every timecard across all clients, billable and non-billable. It must refresh at least weekly and must not affect the month-end coefficient used in margin reporting. It is the most data-heavy and least-known part of Phase 2, so who builds it shapes both the price and the acceptance tests.

## Decision
Runway calculates the coefficient itself. AlixPartners supplies the inputs as a read-only feed (a data lake view or extract):
- timecards for all clients
- Timekeeper attributes (level, home office)
- holiday calendars
- Matter attributes (supervising MD's community, arrangement type)
- non-billable activity categories

Scale implements the flowchart rules in Runway's backend. The calculation is covered by the calculation-match acceptance tests. It is priced as its own line, with the input feed as a written client dependency.

## Rejected alternatives
- **AlixPartners' data team computes it and supplies the result**: rejected because Runway's margin numbers would depend on logic Scale can't test or fix. Defects would bounce between teams during UAT, and the weekly refresh would depend on another team's schedule.
- **Scale builds it inside AlixPartners' data lake**: rejected because it puts Scale's work on a platform we haven't seen and can't price before signing, and it widens the access Scale needs well beyond the Runway environment.

## Consequences
- The rules are testable against sample Engagements alongside the rest of the margin logic.
- Runway holds timecard data for all clients, not just the Engagements in view. Access controls and data retention must reflect that.
- Price risk sits in the input feed. If the required attributes aren't available as described, that's a change order.
- The "no maintenance" rule for non-billable hours needs a stable category attribute on each timecard. Confirm it exists.
- Follow-up: get the Employee Standard Cost formula ("section 3.2.1.1"), which the requirements reference but don't include.
