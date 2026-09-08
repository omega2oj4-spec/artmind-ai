import express from 'express';
import Painting from '../models/Painting.js';
import User from '../models/User.js';
import { optionalAuth } from '../middleware/auth.js';
import { getHomeGalleryArtworks } from '../../src/data/homeArtworks.js';

const router = express.Router();

/**
 * GET /api/analytics/trending
 */
router.get('/trending', optionalAuth, async (req, res) => {
  try {
    const databasePaintings = await Painting.find().sort({ viewsCount: -1, popularity: -1 });

    // Keep analytics useful before the MongoDB catalog has been seeded.
    const paintings = databasePaintings.length > 0
      ? databasePaintings
      : getHomeGalleryArtworks().map((artwork, index) => ({
          ...artwork,
          _id: artwork.id,
          viewsCount: Math.max(1, Math.round((artwork.popularity || 0) * 1.8) + index),
          category: artwork.category || 'Other'
        }));
    const topPaintings = [...paintings]
      .sort((a, b) => (b.viewsCount || 0) + (b.popularity || 0) - (a.viewsCount || 0) - (a.popularity || 0))
      .slice(0, 8);

    const categories = new Map();
    paintings.forEach(painting => {
      const category = painting.category || 'Other';
      const current = categories.get(category) || { _id: category, totalViews: 0, count: 0, popularityTotal: 0 };
      current.totalViews += Number(painting.viewsCount || 0);
      current.count += 1;
      current.popularityTotal += Number(painting.popularity || 0);
      categories.set(category, current);
    });
    const categoryStats = [...categories.values()]
      .map(({ popularityTotal, ...stat }) => ({ ...stat, avgPopularity: stat.count ? popularityTotal / stat.count : 0 }))
      .sort((a, b) => b.totalViews - a.totalViews);

    const totalViews = categoryStats.reduce((acc, c) => acc + c.totalViews, 0);
    const totalArtworks = categoryStats.reduce((acc, c) => acc + c.count, 0);

    // Calculate user-level behavior analytics & personalized insights if user is logged in
    let userStats = null;
    if (req.user) {
      const userDoc = await User.findById(req.user._id).populate('viewHistory.painting');
      if (userDoc) {
        const userViewsCount = userDoc.viewHistory ? userDoc.viewHistory.length : 0;
        const userSearchesCount = userDoc.searchHistory ? userDoc.searchHistory.length : 0;
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
          searchesCount: userSearchesCount,
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
      userStats,
      usingBuiltInData: databasePaintings.length === 0
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return res.status(500).json({ error: 'Server error retrieving analytics' });
  }
});

export default router;
