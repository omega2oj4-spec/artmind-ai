import express from 'express';
import Painting from '../models/Painting.js';
import User from '../models/User.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/analytics/trending
 */
router.get('/trending', optionalAuth, async (req, res) => {
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

    // Calculate user-level behavior analytics & personalized insights if user is logged in
    let userStats = null;
    if (req.user) {
      const userDoc = await User.findById(req.user._id).populate('viewHistory.painting');
      if (userDoc) {
        const userViewsCount = userDoc.viewHistory ? userDoc.viewHistory.length : 0;
        const catFreq = {};
        const styleFreq = {};

        (userDoc.viewHistory || []).forEach(item => {
          if (item.painting) {
            if (item.painting.category) {
              catFreq[item.painting.category] = (catFreq[item.painting.category] || 0) + 1;
            }
            if (item.painting.style) {
              styleFreq[item.painting.style] = (styleFreq[item.painting.style] || 0) + 1;
            }
          }
        });

        const topCat = Object.keys(catFreq).sort((a, b) => catFreq[b] - catFreq[a])[0] || 'Abstract';
        const topStyle = Object.keys(styleFreq).sort((a, b) => styleFreq[b] - styleFreq[a])[0] || 'Impressionism';

        userStats = {
          userName: userDoc.name,
          totalUserViews: userViewsCount,
          favoritesCount: userDoc.favorites ? userDoc.favorites.length : 0,
          topCategory: topCat,
          topStyle: topStyle,
          personalizedInsight: `Based on your viewing activity, your primary artistic affinity is ${topCat} with a strong preference for ${topStyle} masterpieces.`
        };
      }
    }

    return res.json({
      topPaintings,
      categoryStats,
      totalViews,
      totalArtworks,
      userStats
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return res.status(500).json({ error: 'Server error retrieving analytics' });
  }
});

export default router;
