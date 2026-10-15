import 'dotenv/config';
import { db } from '../client';
import {
  resourceCategories, categoryRates, resources,
  engagements, tasks, allocations, allocationPeriods,
  actuals, forecasts, profitHurdle,
} from '../schema';
import { sql } from 'drizzle-orm';

// ── Helpers ──

function weekPeriods(startStr: string, endStr: string): { start: string; end: string }[] {
  // Monday–Sunday weeks, cut to engagement dates at ends
  const periods: { start: string; end: string }[] = [];
  const engEnd = new Date(endStr + 'T00:00:00Z');
  let cursor = new Date(startStr + 'T00:00:00Z');
  // Rewind to Monday if not already
  const dow = cursor.getUTCDay();
  if (dow !== 1) {
    // startDate stays as-is for the first partial week
  }
  while (cursor <= engEnd) {
    const weekStart = new Date(cursor);
    // Find Sunday
    const daysToSunday = (7 - weekStart.getUTCDay()) % 7;
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + daysToSunday);
    // Cap to engagement end
    const cappedEnd = weekEnd > engEnd ? engEnd : weekEnd;
    periods.push({
      start: weekStart.toISOString().slice(0, 10),
      end: cappedEnd.toISOString().slice(0, 10),
    });
    // Next Monday
    cursor = new Date(cappedEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return periods;
}

function monthPeriods(startStr: string, endStr: string): { start: string; end: string }[] {
  const periods: { start: string; end: string }[] = [];
  const engEnd = new Date(endStr + 'T00:00:00Z');
  let cursor = new Date(startStr + 'T00:00:00Z');
  while (cursor <= engEnd) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
    const cappedEnd = monthEnd > engEnd ? engEnd : monthEnd;
    periods.push({
      start: monthStart.toISOString().slice(0, 10),
      end: cappedEnd.toISOString().slice(0, 10),
    });
    cursor = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  }
  return periods;
}

async function seed() {
  console.log('🌱 Seeding Runway prototype data...\n');

  // Clean slate
  await db.execute(sql`TRUNCATE TABLE forecasts, actuals, allocation_periods, allocations, tasks, checkpoints, engagements, category_rates, resources, resource_categories, profit_hurdle CASCADE`);
  console.log('  Cleared existing data');

  // ════════════════════════════════════════════
  // 1. Resource Categories
  // ════════════════════════════════════════════

  const [catPartner] = await db.insert(resourceCategories).values({ name: 'Partner', sortOrder: 1 }).returning();
  const [catPMD] = await db.insert(resourceCategories).values({ name: 'PMD', sortOrder: 2 }).returning();
  const [catDirector] = await db.insert(resourceCategories).values({ name: 'Director', sortOrder: 3 }).returning();
  const [catConsultant] = await db.insert(resourceCategories).values({ name: 'Consultant', sortOrder: 4 }).returning();
  const [catTBD] = await db.insert(resourceCategories).values({ name: 'TBD', sortOrder: 5 }).returning();
  console.log('  ✅ Resource categories (5)');

  // ════════════════════════════════════════════
  // 2. Category Rates (cost by category + region)
  // ════════════════════════════════════════════

  await db.insert(categoryRates).values([
    { resourceCategoryId: catPartner.id, region: 'Americas', costRate: '950.00' },
    { resourceCategoryId: catPMD.id, region: 'Americas', costRate: '750.00' },
    { resourceCategoryId: catDirector.id, region: 'Americas', costRate: '550.00' },
    { resourceCategoryId: catConsultant.id, region: 'Americas', costRate: '350.00' },
    { resourceCategoryId: catTBD.id, region: 'Americas', costRate: '450.00' },
    // EMEA rates (slightly different)
    { resourceCategoryId: catPartner.id, region: 'EMEA', costRate: '900.00' },
    { resourceCategoryId: catPMD.id, region: 'EMEA', costRate: '700.00' },
    { resourceCategoryId: catDirector.id, region: 'EMEA', costRate: '500.00' },
    { resourceCategoryId: catConsultant.id, region: 'EMEA', costRate: '300.00' },
  ]);
  console.log('  ✅ Category rates (9)');

  // ════════════════════════════════════════════
  // 3. Resources (named people + TBD placeholders)
  // ════════════════════════════════════════════

  // Mockup resources (exact rates from the AlixPartners mockup)
  const [marcBrown] = await db.insert(resources).values({
    name: 'Marc Brown', resourceCategoryId: catPMD.id,
    standardRate: '1465.00', region: 'Americas', industryServiceLine: 'RISK',
    idealHoursCoefficient: '0.9430',
  }).returning();

  const [talmageCorey] = await db.insert(resources).values({
    name: 'Talmage Corey', resourceCategoryId: catConsultant.id,
    standardRate: '575.00', region: 'Americas', industryServiceLine: 'RISK',
    idealHoursCoefficient: '0.9430',
  }).returning();

  const [christopherHakim] = await db.insert(resources).values({
    name: 'Christopher Hakim', resourceCategoryId: catDirector.id,
    standardRate: '1030.00', region: 'Americas', industryServiceLine: 'RISK',
    idealHoursCoefficient: '0.9430',
  }).returning();

  const [tbdDirector] = await db.insert(resources).values({
    name: 'TBD Director', resourceCategoryId: catDirector.id,
    standardRate: '1115.00', region: 'Americas', industryServiceLine: 'RISK',
    isPlaceholder: true, idealHoursCoefficient: '0.9430',
  }).returning();

  // Additional resources for Phoenix / Atlas / Meridian
  const [sarahChen] = await db.insert(resources).values({
    name: 'Sarah Chen', resourceCategoryId: catPartner.id,
    standardRate: '1450.00', region: 'Americas', industryServiceLine: 'FIN',
    idealHoursCoefficient: '0.9200',
  }).returning();

  const [jamesWilson] = await db.insert(resources).values({
    name: 'James Wilson', resourceCategoryId: catPMD.id,
    standardRate: '1350.00', region: 'Americas', industryServiceLine: 'FIN',
    idealHoursCoefficient: '0.9100',
  }).returning();

  const [emmaKlein] = await db.insert(resources).values({
    name: 'Emma Klein', resourceCategoryId: catDirector.id,
    standardRate: '1050.00', region: 'Americas', industryServiceLine: 'OPS',
    idealHoursCoefficient: '0.9300',
  }).returning();

  const [michaelPark] = await db.insert(resources).values({
    name: 'Michael Park', resourceCategoryId: catDirector.id,
    standardRate: '980.00', region: 'Americas', industryServiceLine: 'FIN',
    idealHoursCoefficient: '0.9250',
  }).returning();

  const [rachelTang] = await db.insert(resources).values({
    name: 'Rachel Tang', resourceCategoryId: catConsultant.id,
    standardRate: '650.00', region: 'Americas', industryServiceLine: 'FIN',
    idealHoursCoefficient: '0.9400',
  }).returning();

  const [davidNguyen] = await db.insert(resources).values({
    name: 'David Nguyen', resourceCategoryId: catConsultant.id,
    standardRate: '575.00', region: 'Americas', industryServiceLine: 'OPS',
    idealHoursCoefficient: '0.9350',
  }).returning();

  const [lisaAnderson] = await db.insert(resources).values({
    name: 'Lisa Anderson', resourceCategoryId: catConsultant.id,
    standardRate: '525.00', region: 'Americas', industryServiceLine: 'FIN',
    idealHoursCoefficient: '0.9500',
  }).returning();

  const [alexMorris] = await db.insert(resources).values({
    name: 'Alex Morris', resourceCategoryId: catConsultant.id,
    standardRate: '480.00', region: 'Americas', industryServiceLine: 'OPS',
    idealHoursCoefficient: '0.9200',
  }).returning();

  const [tbdConsultant] = await db.insert(resources).values({
    name: 'TBD Consultant', resourceCategoryId: catConsultant.id,
    standardRate: '575.00', region: 'Americas',
    isPlaceholder: true, idealHoursCoefficient: '1.0000',
  }).returning();

  const [tbdPMD] = await db.insert(resources).values({
    name: 'TBD PMD', resourceCategoryId: catPMD.id,
    standardRate: '1300.00', region: 'Americas',
    isPlaceholder: true, idealHoursCoefficient: '1.0000',
  }).returning();

  console.log('  ✅ Resources (14)');

  // ════════════════════════════════════════════
  // 4. Profit Hurdle (quarterly percentages)
  // ════════════════════════════════════════════

  await db.insert(profitHurdle).values([
    { periodStart: '2026-01-01', periodEnd: '2026-03-31', percentage: '0.0800' },
    { periodStart: '2026-04-01', periodEnd: '2026-06-30', percentage: '0.0750' },
    { periodStart: '2026-07-01', periodEnd: '2026-09-30', percentage: '0.0700' },
    { periodStart: '2026-10-01', periodEnd: '2026-12-31', percentage: '0.0800' },
    { periodStart: '2027-01-01', periodEnd: '2027-03-31', percentage: '0.0800' },
    { periodStart: '2027-04-01', periodEnd: '2027-06-30', percentage: '0.0750' },
    { periodStart: '2027-07-01', periodEnd: '2027-09-30', percentage: '0.0700' },
    { periodStart: '2027-10-01', periodEnd: '2027-12-31', percentage: '0.0800' },
  ]);
  console.log('  ✅ Profit hurdle (8 quarters)');

  // ════════════════════════════════════════════
  // 5. ENGAGEMENT 1: Project Phoenix
  //    Fixed Fee, $2.5M, 6 months (monthly), Approved
  //    3 Tasks, 8 Resources, Actuals for first 3 months
  //    Shows margin declining from 25% to 18%
  // ════════════════════════════════════════════

  const [phoenix] = await db.insert(engagements).values({
    clientName: 'Meridian Capital Partners',
    name: 'Project Phoenix',
    engagementOwner: 'Sarah Chen',
    engagementType: 'fixed_fee',
    periodType: 'monthly',
    status: 'approved',
    agreedBaseFees: '2500000.00',
    contingentFees: '0.00',
    startDate: '2027-01-01',
    endDate: '2027-06-30',
    expensesBudget: '375000.00',
    etsBudget: '125000.00',
    digitalToolsBudget: '50000.00',
    budgetMarginPct: '0.2500',
    budgetRealization: '0.9230',
    budgetStaffPmdHours: '3.2000',
    budgetPctBelowDirector: '0.6140',
  }).returning();

  const phoenixPeriods = monthPeriods('2027-01-01', '2027-06-30');

  // Tasks
  const [phxTask1] = await db.insert(tasks).values({
    engagementId: phoenix.id, name: 'Due Diligence', estimatedHours: '800', sortOrder: 1,
  }).returning();
  const [phxTask2] = await db.insert(tasks).values({
    engagementId: phoenix.id, name: 'Financial Analysis', estimatedHours: '600', sortOrder: 2,
  }).returning();
  const [phxTask3] = await db.insert(tasks).values({
    engagementId: phoenix.id, name: 'Integration Planning', estimatedHours: '400', sortOrder: 3,
  }).returning();

  // Allocations + periods for Phoenix
  const phoenixAllocs = [
    { taskId: phxTask1.id, resourceId: sarahChen.id, rate: '1350.00', hoursPerPeriod: [40, 40, 40, 40, 0, 0] },
    { taskId: phxTask1.id, resourceId: emmaKlein.id, rate: '980.00', hoursPerPeriod: [80, 80, 80, 80, 80, 80] },
    { taskId: phxTask1.id, resourceId: rachelTang.id, rate: '600.00', hoursPerPeriod: [60, 60, 60, 60, 60, 60] },
    { taskId: phxTask2.id, resourceId: jamesWilson.id, rate: '1250.00', hoursPerPeriod: [30, 30, 30, 30, 30, 30] },
    { taskId: phxTask2.id, resourceId: michaelPark.id, rate: '920.00', hoursPerPeriod: [60, 60, 60, 60, 60, 60] },
    { taskId: phxTask2.id, resourceId: lisaAnderson.id, rate: '490.00', hoursPerPeriod: [50, 50, 50, 50, 50, 50] },
    { taskId: phxTask3.id, resourceId: davidNguyen.id, rate: '540.00', hoursPerPeriod: [0, 0, 40, 40, 60, 60] },
    { taskId: phxTask3.id, resourceId: alexMorris.id, rate: '450.00', hoursPerPeriod: [0, 0, 30, 30, 50, 50] },
  ];

  for (const alloc of phoenixAllocs) {
    const [a] = await db.insert(allocations).values({
      taskId: alloc.taskId, resourceId: alloc.resourceId, engagementRate: alloc.rate,
    }).returning();
    for (let i = 0; i < phoenixPeriods.length; i++) {
      await db.insert(allocationPeriods).values({
        allocationId: a.id,
        periodStart: phoenixPeriods[i].start,
        periodEnd: phoenixPeriods[i].end,
        hours: String(alloc.hoursPerPeriod[i]),
      });
    }
  }

  // Actuals for first 3 months (slightly over budget to show margin decline)
  const phoenixActualData = [
    { resourceId: sarahChen.id, hours: [45, 48, 44] },
    { resourceId: emmaKlein.id, hours: [90, 85, 88] },
    { resourceId: rachelTang.id, hours: [65, 70, 68] },
    { resourceId: jamesWilson.id, hours: [35, 38, 40] },
    { resourceId: michaelPark.id, hours: [65, 70, 72] },
    { resourceId: lisaAnderson.id, hours: [55, 52, 58] },
  ];

  for (const act of phoenixActualData) {
    for (let i = 0; i < 3; i++) {
      await db.insert(actuals).values({
        engagementId: phoenix.id,
        resourceId: act.resourceId,
        periodStart: phoenixPeriods[i].start,
        periodEnd: phoenixPeriods[i].end,
        hours: String(act.hours[i]),
      });
    }
  }

  console.log('  ✅ Engagement 1: Project Phoenix (Approved, 6mo monthly, 8 resources, 3mo actuals)');

  // ════════════════════════════════════════════
  // 6. ENGAGEMENT 2: Operation Atlas
  //    Fixed Fee, $1.2M, 3 months (weekly), Draft
  //    Shows the budgeting workflow — being built
  // ════════════════════════════════════════════

  const [atlas] = await db.insert(engagements).values({
    clientName: 'Apex Holdings Group',
    name: 'Operation Atlas',
    engagementOwner: 'James Wilson',
    engagementType: 'fixed_fee',
    periodType: 'weekly',
    status: 'draft',
    agreedBaseFees: '1200000.00',
    contingentFees: '0.00',
    startDate: '2027-03-03',
    endDate: '2027-05-25',
    expensesBudget: '180000.00',
    etsBudget: '60000.00',
    digitalToolsBudget: '25000.00',
  }).returning();

  const [atlTask1] = await db.insert(tasks).values({
    engagementId: atlas.id, name: 'Operational Assessment', estimatedHours: '500', sortOrder: 1,
  }).returning();
  const [atlTask2] = await db.insert(tasks).values({
    engagementId: atlas.id, name: 'Cost Reduction Analysis', estimatedHours: '350', sortOrder: 2,
  }).returning();

  const atlasPeriods = weekPeriods('2027-03-03', '2027-05-25');

  // Just a few allocations — it's a Draft being built
  const atlasAllocs = [
    { taskId: atlTask1.id, resourceId: jamesWilson.id, rate: '1250.00', hoursPerWeek: 10 },
    { taskId: atlTask1.id, resourceId: emmaKlein.id, rate: '980.00', hoursPerWeek: 25 },
    { taskId: atlTask1.id, resourceId: davidNguyen.id, rate: '540.00', hoursPerWeek: 35 },
    { taskId: atlTask2.id, resourceId: tbdConsultant.id, rate: '540.00', hoursPerWeek: 30 },
  ];

  for (const alloc of atlasAllocs) {
    const [a] = await db.insert(allocations).values({
      taskId: alloc.taskId, resourceId: alloc.resourceId, engagementRate: alloc.rate,
      placeholderCategoryId: alloc.resourceId === tbdConsultant.id ? catConsultant.id : null,
    }).returning();
    for (const p of atlasPeriods) {
      await db.insert(allocationPeriods).values({
        allocationId: a.id, periodStart: p.start, periodEnd: p.end,
        hours: String(alloc.hoursPerWeek),
      });
    }
  }

  console.log('  ✅ Engagement 2: Operation Atlas (Draft, 3mo weekly, 4 resources)');

  // ════════════════════════════════════════════
  // 7. ENGAGEMENT 3: Meridian Advisory
  //    Fixed Fee, $4M, 12 months (monthly), Approved
  //    6 months Actuals + 6 months Forecast, revenue adj, TBD
  // ════════════════════════════════════════════

  const [meridian] = await db.insert(engagements).values({
    clientName: 'Meridian Financial Services',
    name: 'Meridian Advisory — Restructuring',
    engagementOwner: 'Sarah Chen',
    engagementType: 'fixed_fee',
    periodType: 'monthly',
    status: 'approved',
    agreedBaseFees: '4000000.00',
    contingentFees: '500000.00',
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    expensesBudget: '600000.00',
    etsBudget: '200000.00',
    digitalToolsBudget: '100000.00',
    contingentFeesAdj: '250000.00',
    budgetMarginPct: '0.1800',
    budgetRealization: '0.9150',
    budgetStaffPmdHours: '4.5000',
    budgetPctBelowDirector: '0.5800',
  }).returning();

  const meridianPeriods = monthPeriods('2026-07-01', '2027-06-30');

  const [merTask1] = await db.insert(tasks).values({
    engagementId: meridian.id, name: 'Stakeholder Analysis', estimatedHours: '1200', sortOrder: 1,
  }).returning();
  const [merTask2] = await db.insert(tasks).values({
    engagementId: meridian.id, name: 'Capital Structure Review', estimatedHours: '1800', sortOrder: 2,
  }).returning();
  const [merTask3] = await db.insert(tasks).values({
    engagementId: meridian.id, name: 'Implementation Support', estimatedHours: '1000', sortOrder: 3,
  }).returning();

  const meridianAllocs = [
    { taskId: merTask1.id, resourceId: sarahChen.id, rate: '1350.00', hpm: 20 },
    { taskId: merTask1.id, resourceId: michaelPark.id, rate: '920.00', hpm: 50 },
    { taskId: merTask1.id, resourceId: rachelTang.id, rate: '600.00', hpm: 60 },
    { taskId: merTask2.id, resourceId: jamesWilson.id, rate: '1250.00', hpm: 25 },
    { taskId: merTask2.id, resourceId: emmaKlein.id, rate: '980.00', hpm: 60 },
    { taskId: merTask2.id, resourceId: lisaAnderson.id, rate: '490.00', hpm: 70 },
    { taskId: merTask2.id, resourceId: alexMorris.id, rate: '450.00', hpm: 50 },
    { taskId: merTask3.id, resourceId: tbdPMD.id, rate: '1200.00', hpm: 15 },
    { taskId: merTask3.id, resourceId: tbdConsultant.id, rate: '540.00', hpm: 40 },
  ];

  for (const alloc of meridianAllocs) {
    const [a] = await db.insert(allocations).values({
      taskId: alloc.taskId, resourceId: alloc.resourceId, engagementRate: alloc.rate,
      placeholderCategoryId: [tbdPMD.id, tbdConsultant.id].includes(alloc.resourceId)
        ? (alloc.resourceId === tbdPMD.id ? catPMD.id : catConsultant.id) : null,
    }).returning();
    for (const p of meridianPeriods) {
      await db.insert(allocationPeriods).values({
        allocationId: a.id, periodStart: p.start, periodEnd: p.end, hours: String(alloc.hpm),
      });
    }
  }

  // Actuals for first 6 months (Jul 2026 – Dec 2026)
  const meridianActuals = [
    { resourceId: sarahChen.id, hours: [22, 18, 25, 20, 19, 21] },
    { resourceId: michaelPark.id, hours: [52, 55, 48, 53, 50, 54] },
    { resourceId: rachelTang.id, hours: [62, 58, 65, 60, 63, 61] },
    { resourceId: jamesWilson.id, hours: [28, 30, 25, 27, 26, 29] },
    { resourceId: emmaKlein.id, hours: [63, 58, 65, 62, 60, 64] },
    { resourceId: lisaAnderson.id, hours: [72, 68, 75, 70, 73, 71] },
    { resourceId: alexMorris.id, hours: [52, 48, 55, 50, 53, 51] },
  ];

  for (const act of meridianActuals) {
    for (let i = 0; i < 6; i++) {
      await db.insert(actuals).values({
        engagementId: meridian.id,
        resourceId: act.resourceId,
        periodStart: meridianPeriods[i].start,
        periodEnd: meridianPeriods[i].end,
        hours: String(act.hours[i]),
      });
    }
  }

  console.log('  ✅ Engagement 3: Meridian Advisory (Approved, 12mo monthly, 9 resources, 6mo actuals, revenue adj)');

  // ════════════════════════════════════════════
  // 8. ENGAGEMENT 4: Mockup Replica
  //    THE EXACT engagement from AlixPartners' mockup.
  //    Marc Brown, TBD Director, Talmage Corey, Christopher Hakim
  //    3 weeks weekly, $60K base + $10K contingent adj
  //    Must tie: Margin 12.27%, Realization 94.3%, Staff/PMD 8.03, Below Dir 62.9%
  // ════════════════════════════════════════════

  const [mockup] = await db.insert(engagements).values({
    clientName: 'Demo Client — AlixPartners Mockup',
    name: 'Engagement Tracker Mockup Replica',
    engagementOwner: 'Marc Brown',
    engagementType: 'fixed_fee',
    periodType: 'weekly',
    status: 'approved',
    agreedBaseFees: '60000.00',
    contingentFees: '0.00',
    startDate: '2026-03-30',
    endDate: '2026-04-19',
    expensesBudget: '9000.00',
    etsBudget: '0.00',
    digitalToolsBudget: '10000.00',
    // Adjustments
    contingentFeesAdj: '10000.00',
    // Stored Budget KPIs (from the mockup's Budget column)
    budgetMarginPct: '0.1470',
    budgetRealization: '0.9430',
    budgetStaffPmdHours: '8.9000',
    budgetPctBelowDirector: '0.6140',
  }).returning();

  // 3 weeks: 3/30–4/5, 4/6–4/12, 4/13–4/19
  const mockupPeriods = weekPeriods('2026-03-30', '2026-04-19');

  const [mockTask] = await db.insert(tasks).values({
    engagementId: mockup.id, name: 'Risk Advisory', estimatedHours: '87.75', sortOrder: 1,
  }).returning();

  // Engagement rates from the mockup (Rate (eng) column)
  const mockupAllocs = [
    { resourceId: tbdDirector.id, rate: '1051.4450', hoursPerWeek: [8.5, 8.5, 8.5], placeholderCatId: catDirector.id },
    { resourceId: marcBrown.id, rate: '1381.4950', hoursPerWeek: [2.5, 2.5, 2.5], placeholderCatId: null },
    { resourceId: talmageCorey.id, rate: '542.2250', hoursPerWeek: [18.25, 18.25, 18.25], placeholderCatId: null },
    { resourceId: christopherHakim.id, rate: '971.2900', hoursPerWeek: [0, 0, 0], placeholderCatId: null },
  ];

  for (const alloc of mockupAllocs) {
    const [a] = await db.insert(allocations).values({
      taskId: mockTask.id, resourceId: alloc.resourceId, engagementRate: alloc.rate,
      placeholderCategoryId: alloc.placeholderCatId,
    }).returning();
    for (let i = 0; i < mockupPeriods.length; i++) {
      await db.insert(allocationPeriods).values({
        allocationId: a.id,
        periodStart: mockupPeriods[i].start,
        periodEnd: mockupPeriods[i].end,
        hours: String(alloc.hoursPerWeek[i]),
      });
    }
  }

  // Actuals for weeks 1-2 (from the mockup)
  const mockupActuals = [
    { resourceId: marcBrown.id, hours: [3, 3] },
    { resourceId: talmageCorey.id, hours: [15, 15] },
    { resourceId: christopherHakim.id, hours: [10, 10] },
    // TBD Director has 0 actuals
  ];

  for (const act of mockupActuals) {
    for (let i = 0; i < 2; i++) {
      await db.insert(actuals).values({
        engagementId: mockup.id,
        resourceId: act.resourceId,
        periodStart: mockupPeriods[i].start,
        periodEnd: mockupPeriods[i].end,
        hours: String(act.hours[i]),
      });
    }
  }

  // Forecasts (from the mockup — past periods default to actuals, future to budget)
  const mockupForecasts = [
    { resourceId: marcBrown.id, hours: [3, 3, 2.5] },
    { resourceId: talmageCorey.id, hours: [15, 15, 18.25] },
    { resourceId: christopherHakim.id, hours: [10, 10, 0] },
    { resourceId: tbdDirector.id, hours: [0, 0, 0] },
  ];

  for (const fc of mockupForecasts) {
    for (let i = 0; i < mockupPeriods.length; i++) {
      await db.insert(forecasts).values({
        engagementId: mockup.id,
        resourceId: fc.resourceId,
        periodStart: mockupPeriods[i].start,
        periodEnd: mockupPeriods[i].end,
        hours: String(fc.hours[i]),
      });
    }
  }

  console.log('  ✅ Engagement 4: Mockup Replica (3wk weekly, exact client data, actuals + forecasts)');

  // ════════════════════════════════════════════
  // Done
  // ════════════════════════════════════════════

  console.log('\n🏁 Seed complete:');
  console.log('   5 resource categories');
  console.log('   9 category rates');
  console.log('   14 resources (11 named + 3 TBD)');
  console.log('   8 profit hurdle quarters');
  console.log('   4 engagements:');
  console.log('     1. Project Phoenix — Approved, 6mo monthly, 8 resources, 3mo actuals');
  console.log('     2. Operation Atlas — Draft, 3mo weekly, 4 resources');
  console.log('     3. Meridian Advisory — Approved, 12mo monthly, 9 resources, 6mo actuals + adj');
  console.log('     4. Mockup Replica — Approved, 3wk weekly, exact AlixPartners data');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
