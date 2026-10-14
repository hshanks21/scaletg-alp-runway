# 0001. Reuse the existing Budget Tool database in place

- Status: Accepted
- Date: 2026-10-08

## Context
Runway Phase 1 modernizes both the front end and the backend of AlixPartners' existing Budget Tool. The Budget Tool's database is fed by a daily ETL from SAP and is read by other AlixPartners systems. Any structural change to it forces rework in those dependent systems, which is cost and risk outside Runway's fixed-bid scope. Phase 1 also plans a pilot rollout, where some Engagement Owners use Runway while the rest stay on the Budget Tool.

## Decision
Runway's new backend connects to the existing Budget Tool database in place. Schema changes are additive only (new tables, new nullable columns, new views); no renames, drops or type changes to existing objects. The existing schema is the inspiration for Runway's domain model, not something to redesign in Phase 1.

Fallback: if in-place access proves infeasible (network reachability from AlixPartners' Azure tenant, security policy, or an engine Runway cannot reasonably target), Runway uses a new database that copies the existing structure, kept in sync with the original.

## Rejected alternatives
- **Redesign the schema in a new database with a data migration** — rejected because every dependent system and the SAP ETL would have to be repointed and reworked, which is the cost the client explicitly wants to avoid, and it is unpriceable in a Phase 1 fixed bid.
- **Structural copy as the primary plan** — kept only as the fallback, because it needs a two-way sync to support the pilot rollout and still moves dependent systems unless the sync is perfect.
- **New UI over the existing backend, database untouched** — rejected because the client wants the backend modernized too, and it would tie Runway to the old backend's limits.

## Consequences
- The pilot rollout is cheap: the Budget Tool and Runway read and write the same data.
- Runway inherits the existing schema's naming and quirks; the API layer must translate them into the language in CONTEXT.md.
- Additive-only must be a written SOW constraint and a code-review rule.
- Tasks fit this rule: a new tasks table, plus a new nullable task column on the existing allocation table that the Budget Tool ignores. Allocations with no task (all pre-Runway Budgets, and any rows the Budget Tool inserts) need a defined home in Runway.
- Coexistence during the pilot: the Budget Tool has no notion of Tasks and is not changed. Allocations it adds have no task and land in Runway's Catch-all Task; no lock between the two tools.
- Residual risk: if the Budget Tool saves by delete-and-reinsert, Budget Tool edits would move Runway-assigned Allocations into the Catch-all Task. Confirm its save pattern with the client (discovery agenda §4), since source code is not expected before the quote.
- 2026-10-13: AlixPartners' Engagement Tracker requirements say the current Budget Tool "should not be modified in any way". Scale reads this as no change to the Budget Tool's behavior, so new tables and nullable columns are allowed as long as current software works exactly as before. Confirm this reading with the client before signing.
- Phase 2 (Budget vs. Actual) is the natural point to revisit schema redesign.
- Follow-up: confirm the database engine, its location and network path from the source handover; if the fallback triggers, re-price the sync work and the pilot rollout.
