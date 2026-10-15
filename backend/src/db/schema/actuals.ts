import { pgTable, uuid, date, decimal, timestamp } from 'drizzle-orm/pg-core';
import { engagements } from './engagements';
import { resources } from './resources';

// ── Actuals ──
// Actual hours worked (from SAP ETL in production; seeded in prototype).

export const actuals = pgTable('actuals', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  hours: decimal('hours', { precision: 10, scale: 2 }).notNull().default('0'),
});

// ── Forecasts ──
// Editable forecast hours per resource per period (Phase 2 BvA).

export const forecasts = pgTable('forecasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id').notNull().references(() => resources.id),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  hours: decimal('hours', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Profit Hurdle ──
// Revenue reduction percentages by period (from MDM in production; seeded in prototype).

export const profitHurdle = pgTable('profit_hurdle', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  percentage: decimal('percentage', { precision: 6, scale: 4 }).notNull(),
});
