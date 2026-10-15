/**
 * Runway Profitability Calculation Engine
 *
 * Computes all KPIs from engagement data. Two modes:
 * 1. Budget KPIs — from allocation hours × rates (Phase 1)
 * 2. Forecast KPIs — from forecast hours × rates × coefficient (Phase 2 BvA)
 *
 * CRITICAL DESIGN DECISIONS (verified against AlixPartners mockup):
 * - Est. Total Revenue = Forecasted Revenue + Forecasted Expenses (expenses billed to client)
 * - Estimated Margin % = Estimated Margin ÷ Est. Total Revenue (NOT ÷ Forecasted Revenue)
 *   Verified: $9,694 ÷ $79,000 = 12.27% ✓
 * - Budget KPIs are STORED on the engagement at approval time (not recomputed)
 * - Only Forecast KPIs are recomputed live from the grid
 */

// ── Types ──

export interface ResourceAllocation {
  resourceId: string;
  resourceName: string;
  categoryName: string; // Partner, PMD, Director, Consultant, TBD
  standardRate: number;
  engagementRate: number;
  costRate: number; // from category_rates (by category + region)
  isPlaceholder: boolean;
  idealHoursCoefficient: number;
  hours: number; // total hours across all periods
}

export interface EngagementFinancials {
  agreedBaseFees: number;
  contingentFees: number;
  expensesBudget: number;
  etsBudget: number;
  digitalToolsBudget: number;
  // Adjustments (Phase 2)
  agreedBaseFeesAdj: number;
  contingentFeesAdj: number;
  expenseAdj: number;
  digitalToolsAdj: number;
  etsCostsAdj: number;
}

export interface ProfitHurdleEntry {
  periodStart: string;
  periodEnd: string;
  percentage: number;
}

export interface KPIs {
  // Revenue
  budgetedRevenue: number;
  forecastedRevenue: number;
  estTotalRevenue: number; // forecastedRevenue + forecastedExpenses (expenses billed to client)

  // Costs
  standardCosts: number; // Σ(coefficient × hours × std hourly cost) per resource
  forecastedExpenses: number;
  forecastedETSCosts: number;
  profitHurdleAmount: number;

  // Margin
  estimatedMargin: number;
  estimatedMarginPct: number; // margin ÷ estTotalRevenue

  // Fees
  feesAtStandard: number; // Σ(hours × standard rate)
  feesAtEngagement: number; // Σ(hours × engagement rate)

  // Ratios
  realization: number; // feesAtEngagement ÷ feesAtStandard
  staffPmdHours: number; // hours(Director + Consultant) ÷ hours(PMD)
  pctBelowDirector: number; // hours(Consultant) ÷ total hours

  // Breakdown
  totalHours: number;
  hoursByCategory: Record<string, number>;
}

// ── Calculation ──

const PMD_CATEGORIES = new Set(['Partner', 'PMD']);
const BELOW_DIRECTOR_CATEGORIES = new Set(['Consultant']);
const STAFF_CATEGORIES = new Set(['Director', 'Consultant']);

export function calculateKPIs(
  allocs: ResourceAllocation[],
  financials: EngagementFinancials,
  profitHurdles: ProfitHurdleEntry[],
  mode: 'budget' | 'forecast' = 'forecast',
): KPIs {
  // Hours by category
  const hoursByCategory: Record<string, number> = {};
  let totalHours = 0;
  let feesAtStandard = 0;
  let feesAtEngagement = 0;
  let standardCosts = 0;

  for (const alloc of allocs) {
    const cat = alloc.categoryName || 'Unknown';
    hoursByCategory[cat] = (hoursByCategory[cat] || 0) + alloc.hours;
    totalHours += alloc.hours;

    feesAtStandard += alloc.hours * alloc.standardRate;
    feesAtEngagement += alloc.hours * alloc.engagementRate;

    // Standard cost = coefficient × hours × cost rate (from category_rates)
    const coefficient = mode === 'forecast' ? alloc.idealHoursCoefficient : 1;
    standardCosts += coefficient * alloc.hours * alloc.costRate;
  }

  // Revenue
  const budgetedRevenue = financials.agreedBaseFees + financials.contingentFees;
  const forecastedRevenue = budgetedRevenue + financials.agreedBaseFeesAdj + financials.contingentFeesAdj;

  // Expenses
  const forecastedExpenses = financials.expensesBudget + financials.expenseAdj;
  const forecastedETSCosts = (financials.etsBudget + financials.digitalToolsBudget)
    + financials.digitalToolsAdj + financials.etsCostsAdj;

  // Profit hurdle — sum of (revenue × percentage) for all applicable periods
  // Simplified: use the average hurdle percentage across all periods
  let profitHurdleAmount = 0;
  if (profitHurdles.length > 0) {
    const avgHurdle = profitHurdles.reduce((s, h) => s + h.percentage, 0) / profitHurdles.length;
    profitHurdleAmount = forecastedRevenue * avgHurdle;
  }

  // Est. Total Revenue = Forecasted Revenue + Forecasted Expenses
  // (expenses are billed to the client)
  const estTotalRevenue = forecastedRevenue + forecastedExpenses;

  // Estimated Margin
  const estimatedMargin = forecastedRevenue - standardCosts - forecastedExpenses - forecastedETSCosts - profitHurdleAmount;

  // Margin % uses Est. Total Revenue as denominator
  // Verified: mockup shows $9,694 ÷ $79,000 = 12.27%
  const estimatedMarginPct = estTotalRevenue > 0 ? estimatedMargin / estTotalRevenue : 0;

  // Realization = fees at engagement rates ÷ fees at standard rates
  const realization = feesAtStandard > 0 ? feesAtEngagement / feesAtStandard : 0;

  // Staff/PMD Hours = hours(Director + Consultant) ÷ hours(Partner + PMD)
  const pmdHours = Object.entries(hoursByCategory)
    .filter(([cat]) => PMD_CATEGORIES.has(cat))
    .reduce((s, [, h]) => s + h, 0);
  const staffHours = Object.entries(hoursByCategory)
    .filter(([cat]) => STAFF_CATEGORIES.has(cat))
    .reduce((s, [, h]) => s + h, 0);
  const staffPmdHours = pmdHours > 0 ? staffHours / pmdHours : 0;

  // % Hours Below Director = hours(Consultant) ÷ total hours
  const belowDirectorHours = Object.entries(hoursByCategory)
    .filter(([cat]) => BELOW_DIRECTOR_CATEGORIES.has(cat))
    .reduce((s, [, h]) => s + h, 0);
  const pctBelowDirector = totalHours > 0 ? belowDirectorHours / totalHours : 0;

  return {
    budgetedRevenue,
    forecastedRevenue,
    estTotalRevenue,
    standardCosts,
    forecastedExpenses,
    forecastedETSCosts,
    profitHurdleAmount,
    estimatedMargin,
    estimatedMarginPct,
    feesAtStandard,
    feesAtEngagement,
    realization,
    staffPmdHours,
    pctBelowDirector,
    totalHours,
    hoursByCategory,
  };
}

/**
 * Format KPIs for API response — rounds and adds display strings
 */
export function formatKPIs(kpis: KPIs) {
  return {
    ...kpis,
    estimatedMarginPctDisplay: `${(kpis.estimatedMarginPct * 100).toFixed(2)}%`,
    realizationDisplay: `${(kpis.realization * 100).toFixed(1)}%`,
    staffPmdHoursDisplay: kpis.staffPmdHours.toFixed(1),
    pctBelowDirectorDisplay: `${(kpis.pctBelowDirector * 100).toFixed(1)}%`,
  };
}
