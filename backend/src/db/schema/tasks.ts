import { pgTable, uuid, text, integer, date, decimal } from 'drizzle-orm/pg-core';
import { engagements } from './engagements';
import { resources } from './resources';
import { resourceCategories } from './resources';

// ── Tasks ──
// Budget is built Tasks-first, then Resources are added to absorb each Task's hours.

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }),
  startDate: date('start_date'),
  numPeriods: integer('num_periods'),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ── Allocations ──
// A Resource assigned to a Task, with an engagement-specific rate.

export const allocations = pgTable('allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  resourceId: uuid('resource_id').references(() => resources.id),
  engagementRate: decimal('engagement_rate', { precision: 14, scale: 2 }).notNull(),
  // For placeholders: which category the TBD belongs to
  placeholderCategoryId: uuid('placeholder_category_id').references(() => resourceCategories.id),
});

// ── Allocation Periods ──
// Hours per period for an allocation line.

export const allocationPeriods = pgTable('allocation_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  allocationId: uuid('allocation_id').notNull().references(() => allocations.id, { onDelete: 'cascade' }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  hours: decimal('hours', { precision: 10, scale: 2 }).notNull().default('0'),
});
