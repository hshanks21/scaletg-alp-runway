# Source Database Analysis — Budget Tool (sqldb-mdmebt-prod)

**SQL Server 2019 Enterprise** on `FinanceSQLAG` (Always-On Availability Group). 16 cores, 128GB RAM.

This document maps the existing Budget Tool database to help Scale understand the data model for the Runway prototype and production build.

---

## Key Tables

### Budget Headers & Detail
| Table | Purpose |
|-------|---------|
| `APTBL_BUDGET_HEADER` | One row per budget version — client, engagement name, MD in charge, dates, period type, fees, margins, KPIs |
| `APTBL_BUDGET_DETAIL` | Allocation rows — TK (timekeeper) × period, with hours, fees, fees at standard |
| `APTBL_BUDGET_TK` | Timekeeper assignments to budgets — resource details per budget |
| `APTBL_BUDGET_SUBCON` | Subcontractor entries on budgets |
| `APTBL_BUDGET_SUBCON_DETAIL` | Subcontractor period-level detail |

### Working Budget Tables (CM_ prefix = "Current Month" / working copy)
| Table | Purpose |
|-------|---------|
| `BudgetDetail` | Working budget detail (current version) |
| `BudgetFee` | Fee structure for working budgets |
| `BudgetHR` | Resource/HR data for working budgets |
| `BudgetMetrics` | Calculated metrics for working budgets |
| `BudgetDigitalTool` | Digital tool costs |
| `BudgetLookup` | Lookup data for budget dropdowns |
| `BudgetAccess` | Who can see which budgets |
| `CM_BudgetDetail` | Current-month snapshot of budget detail |
| `CM_BudgetFee` | Current-month snapshot of fees |
| `CM_BudgetHR` | Current-month snapshot of HR |
| `CM_BudgetMetrics` | Current-month snapshot of metrics |

### Employee / Allocation Period Tables
| Table | Purpose |
|-------|---------|
| `EmployeeBudgetPerPeriod` | Hours per employee per period (the allocation grid) |
| `CM_EmployeeBudgetPerPeriod` | Current-month snapshot |

### Master Data (from SAP ETL)
| Table | Purpose |
|-------|---------|
| `SAPEmployeeMaster` | Employee/resource master data |
| `SAPProjectMaster` | SAP project master data |
| `SAPStandardBillRateMaster` | Standard billing rates |
| `SAPCountryMaster` | Country reference data |

### Rates
| Table | Purpose |
|-------|---------|
| `Rate` | Current rates |
| `RateType` | Rate type definitions |
| `ICRates` | Intercompany rates |
| `FxRate` | Foreign exchange rates |
| `ApprovedRates_Archive` | Historical approved rates |

### Reference / Lookup
| Table | Purpose |
|-------|---------|
| `Entity` | Organizational entities |
| `EntityAttributes` | Entity attribute details |
| `EntityGroup` | Entity groupings |
| `CommunityLookup` | Community/practice area lookup |
| `CountryLookup` | Country lookup |
| `CurrencyLookup` | Currency lookup |
| `DepartmentLookup` | Department lookup |
| `LocationCodeMapping` | Location code mapping |
| `LocationHolidayCalender` | Holiday calendars by location (used for Ideal Hours) |
| `ProfitHurdle` | Profit hurdle percentages by period (used in margin calc) |

### Mapping Tables
| Table | Purpose |
|-------|---------|
| `TBDMapping` | Placeholder ("TBD") resource mapping |
| `SubLevelMapping` | Sub-level organizational mapping |
| `SubLevelActivityTypeMapping` | Activity type to sub-level mapping |
| `TitleSublevelActivityMapping` | Title to sub-level activity mapping |
| `ActivityTypeICEmployeeMapping` | Activity type to IC employee mapping |
| `CurrencyCompanyCodeMapping` | Currency to company code mapping |

### Logging / Audit
| Table | Purpose |
|-------|---------|
| `MarginCalcLogs` | Margin calculation audit trail |
| `DataDrivenAppLogs` | Application event logs |
| `ExportDetails` | Export history |

---

## Key Stored Procedures

| Procedure | Purpose |
|-----------|---------|
| `APSP_Engagement_Budget_Margin_Calc` | **THE margin calculation** — the core profitability engine |
| `APSP_Engagement_Budget_Margin_Calc_New` | Updated version of the margin calc |
| `APSP_InsertBudgetMetrics` | Persist calculated metrics |
| `APSP_InsertCMBudgetMetrics` | Persist current-month metrics |
| `SP_CloneBudget` | Clone/copy a budget (versioning) |
| `SP_GetWorkingDaysByPeriod` | Working days calculation (excludes holidays) |
| `SP_GetHolidayDates` | Holiday lookup by location |
| `sp_GetSumStdCost` | Standard cost aggregation |
| `SP_EmpLoyeeDetails` | Employee detail lookup |
| `SP_GetTBDEmployeeDetails` | TBD/placeholder resource details |
| `SP_GetEngagementDetails` | Engagement detail retrieval |
| `SP_CurrencyConversionRate` | FX rate conversion |
| `usp_GetIcRate` | Intercompany rate lookup |

---

## Key Views

| View | Purpose |
|------|---------|
| `V_StandardBillRateByEmployee` | Standard bill rates joined to employee data |
| `V_TBDEmployee` | TBD/placeholder employee view |
| `V_TBDLegacyEmployee` | Legacy TBD employee view |

---

## Key Functions

| Function | Purpose |
|----------|---------|
| `fn_WorkDays` | Calculate working days between two dates |
| `fn_Holidays` | Holiday check for a date/location |
| `fn_GetStdCostRegionByYear` | Standard cost region lookup |
| `fn_GetRegionByYear` | Region lookup by year |
| `fn_GetISLServiceLine` | ISL service line lookup |

---

## Schema Observations for Runway

1. **Budget versioning** is done via `BUDGET_VERSION_DATE` + `IS_CURRENT` flag on headers — not a separate versions table. `SP_CloneBudget` creates a copy.

2. **Period allocations** live in `EmployeeBudgetPerPeriod` — one row per employee per period. This is the "grid" the Budget Tool shows.

3. **The margin calc stored procedure** (`APSP_Engagement_Budget_Margin_Calc_New`, ~200+ lines) is the heart of the system. Runway must match its output but can implement the logic differently.

4. **Holiday calendars** are stored in `LocationHolidayCalender` (note: their spelling) — critical for the Ideal Hours Coefficient calculation.

5. **Profit Hurdle** is in `ProfitHurdle` — percentages by period that reduce forecasted revenue before margin is calculated.

6. **TBD/Placeholder resources** are mapped via `TBDMapping` and surfaced through `V_TBDEmployee`.

7. **Multi-currency support** — `FxRate`, `CurrencyLookup`, `CurrencyCompanyCodeMapping` suggest the tool handles multiple currencies.

8. **The `CM_` prefix tables** appear to be current-month snapshots used for comparison — this is the Budget vs. Actual foundation.

9. **No explicit approval workflow table** — approval state may live in the header flags or be tracked externally.

10. **`BudgetAccess`** controls who can see which budgets — maps to our Engagement Owner visibility rule.
