# Responsive Design Plan

Status: Draft — blocked on sidebar-nav decision
Last updated: 2026-10-28

## Summary

The app is currently desktop-locked: no media queries, no viewport detection,
and all layout is fixed inline styles (sidebar `210px`, appbar `1fr 440px 1fr`,
KPI grid `1.15fr 1fr 1fr`). Goal: make it usable from iPads down to phones,
with **tablet as the primary target** and phone as a best-effort fallback.

## Prerequisite: sidebar-nav decision

The responsive pattern should not be built until the sidebar-nav redesign is
finalized, because:

- The sidebar's final form (card-based `APPROVED`/`DRAFT` sections vs. the
  current flat list) determines what its collapsed/mobile state looks like.
- "New engagement" placement and status grouping affect the mobile nav structure.

Resolution order: **(1) sidebar-nav decision → (2) responsive pattern.**

## Responsive targets

- **Primary — iPad / tablet (≥ 768px):** full responsive treatment.
- **Secondary — phone (< 768px):** best-effort fallback (stack grids, scroll tables).

## Proposed breakpoints

| Tier    | Width      | Notes                                |
|---------|------------|--------------------------------------|
| Desktop | > 1024px   | Current behavior                     |
| Tablet  | 768–1024px | KPI grid → 2 cols; sidebar collapses |
| Phone   | < 768px    | KPI grid → 1 col; tables scroll      |

## Scope by surface

1. **App shell (`AppLayout`)** — sidebar collapses to a drawer/hamburger below
   tablet; appbar stacks or simplifies.
2. **KPI 5-card grid** — breakpoint-driven column count (3 → 2 → 1); the Margin
   card's `span 2` drops on narrow widths.
3. **Header metadata row** — wrap to a 2-column grid on tablet, 1 column on phone.
4. **Engagement list table** — horizontal scroll (or card layout, TBD).
5. **Staffing plan table** — horizontal scroll on tablet+; phone = see below.

## Staffing plan on phones — decision

Recommend **tablet/desktop only** for the staffing plan. It is a dense
resource × week editing surface (7 columns) and does not translate to a phone
card layout without destroying the side-by-side week view that makes it useful.

- Phone fallback: horizontal scroll, read-only.
- No custom card redesign.
- If a true phone experience is later required, treat it as a dedicated effort,
  not a responsive retrofit.

## Mechanism (recommended)

Hybrid approach:

- `useBreakpoint` hook (`matchMedia`) for structural decisions (sidebar, grids).
- Pure CSS `overflow-x: auto` for tables.
- CSS variables for fine-grained spacing at breakpoints.

## Open questions

1. Exact breakpoints (1024 / 768 confirmed?).
2. Sidebar mobile behavior: hamburger drawer vs. top nav.
3. Tables: horizontal scroll vs. card layout.
4. Confirm staffing plan is tablet-only (not phone).
