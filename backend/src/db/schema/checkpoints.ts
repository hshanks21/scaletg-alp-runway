import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { engagements } from './engagements';

// ── Checkpoints ──
// Snapshots at Submitted, Approved, Modified. JSONB captures the full Budget state.

export const checkpointKindEnum = pgEnum('checkpoint_kind', ['submitted', 'approved', 'modified']);

export const checkpoints = pgTable('checkpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  engagementId: uuid('engagement_id').notNull().references(() => engagements.id, { onDelete: 'cascade' }),
  kind: checkpointKindEnum('kind').notNull(),
  label: text('label'),
  snapshot: jsonb('snapshot').notNull(),
  comment: text('comment'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
