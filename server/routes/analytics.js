import express from 'express';
import Painting from '../models/Painting.js';

const router = express.Router();

/**
 * GET /api/analytics/trending
 */
router.get('/trending', async (req, res) => {
  try {
    const topPaintings = await Painting.find().sort({ viewsCount: -1, popularity: -1 }).limit(8);

    // Aggregate category engagement
    const categoryStats = await Painting.aggregate([
      {
        $group: {
          _id: '$category',
          totalViews: { $sum: '$viewsCount' },
          count: { $sum: 1 },
          avgPopularity: { $avg: '$popularity' }
        }
      },
      { $sort: { totalViews: -1 } }
    ]);

    const totalViews = categoryStats.reduce((acc, c) => acc + c.totalViews, 0);
    const totalArtworks = categoryStats.reduce((acc, c) => acc + c.count, 0);

    return res.json({
      topPaintings,
      categoryStats,
      totalViews,
      totalArtworks
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return res.status(500).json({ error: 'Server error retrieving analytics' });
  }
});

export default router;
