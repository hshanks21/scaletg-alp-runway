import { Router } from 'express';
import { db } from '../db/client';
import {
  engagements, tasks, allocations, allocationPeriods,
  resources, resourceCategories, categoryRates,
  actuals, forecasts, checkpoints, profitHurdle,
} from '../db/schema';
import { eq, and, sql, asc, desc, gte, lte } from 'drizzle-orm';

const router = Router();

// ── GET /api/engagements — list with status filter ──

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const rows = await db.select({
      id: engagements.id,
      clientName: engagements.clientName,
      name: engagements.name,
      engagementOwner: engagements.engagementOwner,
      engagementType: engagements.engagementType,
      periodType: engagements.periodType,
      status: engagements.status,
      agreedBaseFees: engagements.agreedBaseFees,
      contingentFees: engagements.contingentFees,
      startDate: engagements.startDate,
      endDate: engagements.endDate,
      createdAt: engagements.createdAt,
    })
    .from(engagements)
    .where(status && typeof status === 'string' ? eq(engagements.status, status as any) : undefined)
    .orderBy(desc(engagements.createdAt));

    res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error('Error listing engagements:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/engagements — create ──

router.post('/', async (req, res) => {
  try {
    const {
      clientName, name, engagementOwner, engagementType, periodType,
      agreedBaseFees, contingentFees, startDate, endDate,
      expensesBudget, etsBudget, digitalToolsBudget,
    } = req.body;

    if (!clientName || !name || !engagementOwner || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const [created] = await db.insert(engagements).values({
      clientName, name, engagementOwner,
      engagementType: engagementType || 'fixed_fee',
      periodType: periodType || 'weekly',
      agreedBaseFees: agreedBaseFees || '0',
      contingentFees: contingentFees || '0',
      startDate, endDate,
      expensesBudget: expensesBudget || '0',
      etsBudget: etsBudget || '0',
      digitalToolsBudget: digitalToolsBudget || '0',
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    console.error('Error creating engagement:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/engagements/:id — full detail with tasks, allocations, resources ──

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [engagement] = await db.select().from(engagements).where(eq(engagements.id, id));
    if (!engagement) return res.status(404).json({ success: false, error: 'Engagement not found' });

    // Tasks with allocations and periods
    const taskRows = await db.select().from(tasks)
      .where(eq(tasks.engagementId, id))
      .orderBy(asc(tasks.sortOrder));

    const allocationRows = await db
      .select({
        id: allocations.id,
        taskId: allocations.taskId,
        resourceId: allocations.resourceId,
        engagementRate: allocations.engagementRate,
        placeholderCategoryId: allocations.placeholderCategoryId,
        resourceName: resources.name,
        standardRate: resources.standardRate,
        categoryName: resourceCategories.name,
        isPlaceholder: resources.isPlaceholder,
        region: resources.region,
        industryServiceLine: resources.industryServiceLine,
        idealHoursCoefficient: resources.idealHoursCoefficient,
      })
      .from(allocations)
      .innerJoin(tasks, eq(allocations.taskId, tasks.id))
      .leftJoin(resources, eq(allocations.resourceId, resources.id))
      .leftJoin(resourceCategories, eq(resources.resourceCategoryId, resourceCategories.id))
      .where(eq(tasks.engagementId, id));

    const periodRows = await db
      .select({
        id: allocationPeriods.id,
        allocationId: allocationPeriods.allocationId,
        periodStart: allocationPeriods.periodStart,
        periodEnd: allocationPeriods.periodEnd,
        hours: allocationPeriods.hours,
      })
      .from(allocationPeriods)
      .innerJoin(allocations, eq(allocationPeriods.allocationId, allocations.id))
      .innerJoin(tasks, eq(allocations.taskId, tasks.id))
      .where(eq(tasks.engagementId, id))
      .orderBy(asc(allocationPeriods.periodStart));

    // Nest allocations under tasks, periods under allocations
    const enrichedTasks = taskRows.map(task => {
      const taskAllocs = allocationRows
        .filter(a => a.taskId === task.id)
        .map(alloc => ({
          ...alloc,
          periods: periodRows.filter(p => p.allocationId === alloc.id),
        }));

      const allocatedHours = taskAllocs.reduce((sum, a) =>
        sum + a.periods.reduce((s, p) => s + parseFloat(p.hours || '0'), 0), 0);

      return { ...task, allocations: taskAllocs, allocatedHours };
    });

    res.json({ success: true, data: { ...engagement, tasks: enrichedTasks } });
  } catch (err: any) {
    console.error('Error fetching engagement:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/engagements/:id — update ──

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    updates.updatedAt = new Date();

    const [updated] = await db.update(engagements)
      .set(updates)
      .where(eq(engagements.id, id))
      .returning();

    if (!updated) return res.status(404).json({ success: false, error: 'Engagement not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error updating engagement:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/engagements/:id/tasks — add task ──

router.post('/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, estimatedHours, startDate, numPeriods, sortOrder } = req.body;

    const [created] = await db.insert(tasks).values({
      engagementId: id, name, estimatedHours, startDate, numPeriods,
      sortOrder: sortOrder || 0,
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/engagements/:id/tasks/:taskId — update task ──

router.patch('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const [updated] = await db.update(tasks).set(req.body).where(eq(tasks.id, taskId)).returning();
    if (!updated) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/engagements/:id/tasks/:taskId — delete task ──

router.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    await db.delete(tasks).where(eq(tasks.id, taskId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/engagements/:id/allocations — add allocation ──

router.post('/:id/allocations', async (req, res) => {
  try {
    const { taskId, resourceId, engagementRate, placeholderCategoryId } = req.body;

    const [created] = await db.insert(allocations).values({
      taskId, resourceId, engagementRate, placeholderCategoryId,
    }).returning();

    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/engagements/:id/allocations/:allocId/periods — bulk update period hours ──

router.patch('/:id/allocations/:allocId/periods', async (req, res) => {
  try {
    const { periods } = req.body; // [{ id, hours }]
    if (!Array.isArray(periods)) {
      return res.status(400).json({ success: false, error: 'periods must be an array of { id, hours }' });
    }

    const updated = [];
    for (const p of periods) {
      const [row] = await db.update(allocationPeriods)
        .set({ hours: String(p.hours) })
        .where(eq(allocationPeriods.id, p.id))
        .returning();
      if (row) updated.push(row);
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/engagements/:id/submit — submit for approval ──

router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const [eng] = await db.select().from(engagements).where(eq(engagements.id, id));
    if (!eng) return res.status(404).json({ success: false, error: 'Not found' });
    if (eng.status !== 'draft' && eng.status !== 'rejected') {
      return res.status(400).json({ success: false, error: `Cannot submit from status '${eng.status}'` });
    }

    // Create checkpoint snapshot
    // (In a real implementation, snapshot the full engagement state as JSONB)
    await db.insert(checkpoints).values({
      engagementId: id,
      kind: 'submitted',
      label: `Submitted ${new Date().toISOString().slice(0, 10)}`,
      snapshot: { submittedAt: new Date().toISOString() },
      createdBy: req.body.createdBy || 'system',
    });

    const [updated] = await db.update(engagements)
      .set({ status: 'submitted', updatedAt: new Date() })
      .where(eq(engagements.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/engagements/:id/approve — approve ──

router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const [eng] = await db.select().from(engagements).where(eq(engagements.id, id));
    if (!eng) return res.status(404).json({ success: false, error: 'Not found' });
    if (eng.status !== 'submitted') {
      return res.status(400).json({ success: false, error: `Cannot approve from status '${eng.status}'` });
    }

    await db.insert(checkpoints).values({
      engagementId: id,
      kind: 'approved',
      label: `Approved ${new Date().toISOString().slice(0, 10)}`,
      snapshot: { approvedAt: new Date().toISOString() },
      createdBy: req.body.createdBy || 'approver',
    });

    const [updated] = await db.update(engagements)
      .set({ status: 'approved', updatedAt: new Date() })
      .where(eq(engagements.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/engagements/:id/reject — reject with comment ──

router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, createdBy } = req.body;

    const [eng] = await db.select().from(engagements).where(eq(engagements.id, id));
    if (!eng) return res.status(404).json({ success: false, error: 'Not found' });
    if (eng.status !== 'submitted') {
      return res.status(400).json({ success: false, error: `Cannot reject from status '${eng.status}'` });
    }

    await db.insert(checkpoints).values({
      engagementId: id,
      kind: 'modified',
      label: `Rejected ${new Date().toISOString().slice(0, 10)}`,
      snapshot: { rejectedAt: new Date().toISOString() },
      comment: comment || null,
      createdBy: createdBy || 'approver',
    });

    const [updated] = await db.update(engagements)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(engagements.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/engagements/:id/checkpoints — list checkpoints ──

router.get('/:id/checkpoints', async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db.select().from(checkpoints)
      .where(eq(checkpoints.engagementId, id))
      .orderBy(desc(checkpoints.createdAt));

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/engagements/:id/budget-vs-actual — BvA comparison ──

router.get('/:id/budget-vs-actual', async (req, res) => {
  try {
    const { id } = req.params;

    const [engagement] = await db.select().from(engagements).where(eq(engagements.id, id));
    if (!engagement) return res.status(404).json({ success: false, error: 'Not found' });

    // All allocations with resource info
    const allocationRows = await db
      .select({
        allocationId: allocations.id,
        taskId: allocations.taskId,
        resourceId: allocations.resourceId,
        engagementRate: allocations.engagementRate,
        resourceName: resources.name,
        standardRate: resources.standardRate,
        categoryName: resourceCategories.name,
        isPlaceholder: resources.isPlaceholder,
        region: resources.region,
        idealHoursCoefficient: resources.idealHoursCoefficient,
      })
      .from(allocations)
      .innerJoin(tasks, eq(allocations.taskId, tasks.id))
      .leftJoin(resources, eq(allocations.resourceId, resources.id))
      .leftJoin(resourceCategories, eq(resources.resourceCategoryId, resourceCategories.id))
      .where(eq(tasks.engagementId, id));

    // Budget periods (from allocation_periods)
    const budgetPeriods = await db
      .select({
        allocationId: allocationPeriods.allocationId,
        periodStart: allocationPeriods.periodStart,
        periodEnd: allocationPeriods.periodEnd,
        hours: allocationPeriods.hours,
      })
      .from(allocationPeriods)
      .innerJoin(allocations, eq(allocationPeriods.allocationId, allocations.id))
      .innerJoin(tasks, eq(allocations.taskId, tasks.id))
      .where(eq(tasks.engagementId, id))
      .orderBy(asc(allocationPeriods.periodStart));

    // Actuals
    const actualRows = await db.select().from(actuals)
      .where(eq(actuals.engagementId, id))
      .orderBy(asc(actuals.periodStart));

    // Forecasts
    const forecastRows = await db.select().from(forecasts)
      .where(eq(forecasts.engagementId, id))
      .orderBy(asc(forecasts.periodStart));

    // Get unique periods
    const periodSet = new Set<string>();
    budgetPeriods.forEach(p => periodSet.add(`${p.periodStart}|${p.periodEnd}`));
    const periods = Array.from(periodSet).sort().map(p => {
      const [start, end] = p.split('|');
      return { start, end };
    });

    // Build per-resource BvA grid
    const resourceGrid = allocationRows.map(alloc => {
      const allocBudgetPeriods = budgetPeriods.filter(p => p.allocationId === alloc.allocationId);
      const resActuals = actualRows.filter(a => a.resourceId === alloc.resourceId);
      const resForecasts = forecastRows.filter(f => f.resourceId === alloc.resourceId);

      const periodData = periods.map(period => {
        const budgetHours = parseFloat(
          allocBudgetPeriods.find(p => p.periodStart === period.start)?.hours || '0'
        );
        const actualHours = parseFloat(
          resActuals.find(a => a.periodStart === period.start)?.hours || '0'
        );
        const forecastHours = parseFloat(
          resForecasts.find(f => f.periodStart === period.start)?.hours || '0'
        );
        const stdRate = parseFloat(alloc.standardRate || '0');
        const engRate = parseFloat(alloc.engagementRate || '0');

        return {
          periodStart: period.start,
          periodEnd: period.end,
          budget: { hours: budgetHours, feesAtStd: budgetHours * stdRate, feesAtEng: budgetHours * engRate },
          actual: { hours: actualHours, feesAtStd: actualHours * stdRate, feesAtEng: actualHours * engRate },
          forecast: { hours: forecastHours, feesAtStd: forecastHours * stdRate, feesAtEng: forecastHours * engRate },
        };
      });

      return {
        resourceId: alloc.resourceId,
        resourceName: alloc.resourceName,
        categoryName: alloc.categoryName,
        standardRate: alloc.standardRate,
        engagementRate: alloc.engagementRate,
        isPlaceholder: alloc.isPlaceholder,
        region: alloc.region,
        idealHoursCoefficient: alloc.idealHoursCoefficient,
        periods: periodData,
        totals: {
          budget: {
            hours: periodData.reduce((s, p) => s + p.budget.hours, 0),
            feesAtStd: periodData.reduce((s, p) => s + p.budget.feesAtStd, 0),
            feesAtEng: periodData.reduce((s, p) => s + p.budget.feesAtEng, 0),
          },
          actual: {
            hours: periodData.reduce((s, p) => s + p.actual.hours, 0),
            feesAtStd: periodData.reduce((s, p) => s + p.actual.feesAtStd, 0),
            feesAtEng: periodData.reduce((s, p) => s + p.actual.feesAtEng, 0),
          },
          forecast: {
            hours: periodData.reduce((s, p) => s + p.forecast.hours, 0),
            feesAtStd: periodData.reduce((s, p) => s + p.forecast.feesAtStd, 0),
            feesAtEng: periodData.reduce((s, p) => s + p.forecast.feesAtEng, 0),
          },
        },
      };
    });

    res.json({
      success: true,
      data: {
        engagement,
        periods,
        resources: resourceGrid,
      },
    });
  } catch (err: any) {
    console.error('Error fetching BvA:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/engagements/:id/forecasts — update forecast hours ──

router.patch('/:id/forecasts', async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // [{ resourceId, periodStart, periodEnd, hours }]

    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'items must be an array' });
    }

    const results = [];
    for (const item of items) {
      // Upsert: update if exists, insert if not
      const existing = await db.select().from(forecasts).where(
        and(
          eq(forecasts.engagementId, id),
          eq(forecasts.resourceId, item.resourceId),
          eq(forecasts.periodStart, item.periodStart),
        )
      );

      if (existing.length > 0) {
        const [updated] = await db.update(forecasts)
          .set({ hours: String(item.hours), updatedAt: new Date() })
          .where(eq(forecasts.id, existing[0].id))
          .returning();
        results.push(updated);
      } else {
        const [created] = await db.insert(forecasts).values({
          engagementId: id,
          resourceId: item.resourceId,
          periodStart: item.periodStart,
          periodEnd: item.periodEnd,
          hours: String(item.hours),
        }).returning();
        results.push(created);
      }
    }

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/engagements/:id/forecasts/remove-tbd — remove all TBD forecasts ──

router.post('/:id/forecasts/remove-tbd', async (req, res) => {
  try {
    const { id } = req.params;

    // Find placeholder resource IDs
    const placeholderResources = await db.select({ id: resources.id })
      .from(resources)
      .where(eq(resources.isPlaceholder, true));

    const placeholderIds = placeholderResources.map(r => r.id);

    if (placeholderIds.length > 0) {
      for (const resId of placeholderIds) {
        await db.update(forecasts)
          .set({ hours: '0', updatedAt: new Date() })
          .where(and(
            eq(forecasts.engagementId, id),
            eq(forecasts.resourceId, resId),
          ));
      }
    }

    res.json({ success: true, message: `Zeroed forecasts for ${placeholderIds.length} TBD resources` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/engagements/:id/adjustments — update revenue/expense/ETS adjustments ──

router.patch('/:id/adjustments', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      agreedBaseFeesAdj, contingentFeesAdj, expenseAdj, digitalToolsAdj, etsCostsAdj,
    } = req.body;

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (agreedBaseFeesAdj !== undefined) updates.agreedBaseFeesAdj = String(agreedBaseFeesAdj);
    if (contingentFeesAdj !== undefined) updates.contingentFeesAdj = String(contingentFeesAdj);
    if (expenseAdj !== undefined) updates.expenseAdj = String(expenseAdj);
    if (digitalToolsAdj !== undefined) updates.digitalToolsAdj = String(digitalToolsAdj);
    if (etsCostsAdj !== undefined) updates.etsCostsAdj = String(etsCostsAdj);

    const [updated] = await db.update(engagements)
      .set(updates)
      .where(eq(engagements.id, id))
      .returning();

    if (!updated) return res.status(404).json({ success: false, error: 'Engagement not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
