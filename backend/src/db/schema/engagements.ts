import { pgTable, uuid, text, timestamp, decimal, date, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// ── Enums ──

export const engagementTypeEnum = pgEnum('engagement_type', ['fixed_fee', 'hourly']);
export const periodTypeEnum = pgEnum('period_type', ['weekly', 'monthly']);
export const engagementStatusEnum = pgEnum('engagement_status', [
  'draft', 'submitted', 'approved', 'rejected', 'modified',
]);

// ── Engagements ──

export const engagements = pgTable('engagements', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientName: text('client_name').notNull(),
  name: text('name').notNull(),
  engagementOwner: text('engagement_owner').notNull(),
  engagementType: engagementTypeEnum('engagement_type').notNull().default('fixed_fee'),
  periodType: periodTypeEnum('period_type').notNull().default('weekly'),
  status: engagementStatusEnum('status').notNull().default('draft'),

  // Fees
  agreedBaseFees: decimal('agreed_base_fees', { precision: 14, scale: 2 }).notNull().default('0'),
  contingentFees: decimal('contingent_fees', { precision: 14, scale: 2 }).notNull().default('0'),

  // Dates
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),

  // Budgeted costs
  expensesBudget: decimal('expenses_budget', { precision: 14, scale: 2 }).notNull().default('0'),
  etsBudget: decimal('ets_budget', { precision: 14, scale: 2 }).notNull().default('0'),
  digitalToolsBudget: decimal('digital_tools_budget', { precision: 14, scale: 2 }).notNull().default('0'),

  // Adjustments (Phase 2 BvA — editable fields, yellow in the mockup)
  agreedBaseFeesAdj: decimal('agreed_base_fees_adj', { precision: 14, scale: 2 }).notNull().default('0'),
  contingentFeesAdj: decimal('contingent_fees_adj', { precision: 14, scale: 2 }).notNull().default('0'),
  expenseAdj: decimal('expense_adj', { precision: 14, scale: 2 }).notNull().default('0'),
  digitalToolsAdj: decimal('digital_tools_adj', { precision: 14, scale: 2 }).notNull().default('0'),
  etsCostsAdj: decimal('ets_costs_adj', { precision: 14, scale: 2 }).notNull().default('0'),

  // Stored Budget KPIs (snapshotted at approval — Budget column in BvA)
  budgetMarginPct: decimal('budget_margin_pct', { precision: 8, scale: 4 }),
  budgetRealization: decimal('budget_realization', { precision: 8, scale: 4 }),
  budgetStaffPmdHours: decimal('budget_staff_pmd_hours', { precision: 8, scale: 4 }),
  budgetPctBelowDirector: decimal('budget_pct_below_director', { precision: 8, scale: 4 }),

  // Metadata
  currency: text('currency').notNull().default('USD'),
  businessUnit: text('business_unit'),
  community: text('community'),
  country: text('country'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
