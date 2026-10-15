import { Router } from 'express';
import { db } from '../db/client';
import { resources, resourceCategories } from '../db/schema';
import { eq, asc, ilike } from 'drizzle-orm';

const router = Router();

// ── GET /api/resources — list with optional category filter and search ──

router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = db
      .select({
        id: resources.id,
        name: resources.name,
        standardRate: resources.standardRate,
        region: resources.region,
        industryServiceLine: resources.industryServiceLine,
        homeOffice: resources.homeOffice,
        isPlaceholder: resources.isPlaceholder,
        idealHoursCoefficient: resources.idealHoursCoefficient,
        categoryId: resourceCategories.id,
        categoryName: resourceCategories.name,
      })
      .from(resources)
      .leftJoin(resourceCategories, eq(resources.resourceCategoryId, resourceCategories.id))
      .orderBy(asc(resourceCategories.sortOrder), asc(resources.name));

    const rows = await query;

    let filtered = rows;
    if (category && typeof category === 'string') {
      filtered = filtered.filter(r => r.categoryName?.toLowerCase() === category.toLowerCase());
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => r.name.toLowerCase().includes(q));
    }

    res.json({ success: true, data: filtered });
  } catch (err: any) {
    console.error('Error listing resources:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
