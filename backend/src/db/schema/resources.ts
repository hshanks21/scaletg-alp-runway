import { pgTable, uuid, text, integer, decimal, boolean } from 'drizzle-orm/pg-core';

// ── Resource Categories ──
// Partner, PMD, Director, Consultant, TBD

export const resourceCategories = pgTable('resource_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ── Category Rates ──
// Cost rates held by Category + Region (not per person — product-decisions)

export const categoryRates = pgTable('category_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceCategoryId: uuid('resource_category_id').notNull().references(() => resourceCategories.id),
  region: text('region').notNull().default('Americas'),
  costRate: decimal('cost_rate', { precision: 14, scale: 2 }).notNull(),
});

// ── Resources ──
// Named people or TBD placeholders

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  resourceCategoryId: uuid('resource_category_id').notNull().references(() => resourceCategories.id),
  standardRate: decimal('standard_rate', { precision: 14, scale: 2 }).notNull(),
  industryServiceLine: text('industry_service_line'),
  region: text('region').notNull().default('Americas'),
  homeOffice: text('home_office'),
  isPlaceholder: boolean('is_placeholder').notNull().default(false),
  // Ideal Hours Coefficient — seeded per resource for the prototype
  idealHoursCoefficient: decimal('ideal_hours_coefficient', { precision: 6, scale: 4 }).notNull().default('1.0000'),
});
