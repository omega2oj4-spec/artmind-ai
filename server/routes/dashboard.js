import express from 'express';
import { optionalAuth, protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Painting from '../models/Painting.js';

const router = express.Router();

/**
 * POST /api/views/:paintingId
 * Log view count and add to user view history
 */
router.post('/views/:paintingId', optionalAuth, async (req, res) => {
  try {
    const painting = await Painting.findById(req.params.paintingId);
    if (!painting) return res.status(404).json({ error: 'Painting not found' });

    painting.viewsCount += 1;
    await painting.save();

    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        // Keep view history trimmed to last 25 entries
        user.viewHistory.unshift({ painting: painting._id, viewedAt: new Date() });
        if (user.viewHistory.length > 25) {
          user.viewHistory = user.viewHistory.slice(0, 25);
        }
        await user.save();
      }
    }

    return res.json({ message: 'View recorded', viewsCount: painting.viewsCount });
  } catch (err) {
    console.error('Error logging painting view:', err);
    return res.status(500).json({ error: 'Error logging view' });
  }
});

/**
 * GET /api/dashboard
 * Returns personalized dashboard data
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    let user = null;
    if (req.user) {
      user = await User.findById(req.user._id).populate('favorites').populate('viewHistory.painting');
    }

    const allPaintings = await Painting.find();

    // 1. Recently Viewed
    let recentlyViewed = [];
    if (user && user.viewHistory && user.viewHistory.length > 0) {
      const seenIds = new Set();
      for (const item of user.viewHistory) {
        if (item.painting && !seenIds.has(item.painting._id.toString())) {
          seenIds.add(item.painting._id.toString());
          recentlyViewed.push(item.painting);
        }
        if (recentlyViewed.length >= 10) break;
      }
    }
    if (recentlyViewed.length === 0) {
      recentlyViewed = await Painting.find().sort({ updatedAt: -1 }).limit(10);
    }

    // 2. Favorite Categories derivation
    const categoryCounts = {};
    const favoriteCategoriesSet = new Set();

    if (user) {
      (user.favorites || []).forEach(p => {
        if (p && p.category) {
          categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 3;
        }
      });
      (user.viewHistory || []).forEach(v => {
        if (v.painting && v.painting.category) {
          categoryCounts[v.painting.category] = (categoryCounts[v.painting.category] || 0) + 1;
        }
      });
    }

    const sortedCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);
    const favoriteCategories = sortedCategories.length > 0 ? sortedCategories : ['Abstract', 'Landscape', 'Flower', 'Nature'];

    // 3. Recommendation Scoring Algorithm
    // Criteria:
    // - User's preferred category: +2
    // - Same style as user's favorites/views: +2
    // - Same color medium or medium: +1
    // - Preferred color theme: +1
    // - High popularity: +1
    const favStyles = new Set((user?.favorites || []).map(p => p.style).filter(Boolean));
    const favMediums = new Set((user?.favorites || []).map(p => p.colorMedium || p.medium).filter(Boolean));
    const favColorThemes = new Set((user?.favorites || []).map(p => p.colorTheme).filter(Boolean));
    (user?.viewHistory || []).forEach(v => {
      if (v.painting && v.painting.colorTheme) favColorThemes.add(v.painting.colorTheme);
      if (v.painting && v.painting.style) favStyles.add(v.painting.style);
    });
    const favCategories = new Set(favoriteCategories);

    const scored = allPaintings.map(painting => {
      let score = 0;
      if (favCategories.has(painting.category)) score += 2;
      if (favStyles.has(painting.style)) score += 2;
      if (favMediums.has(painting.colorMedium) || favMediums.has(painting.medium)) score += 1;
      if (favColorThemes.has(painting.colorTheme)) score += 1;
      if (painting.popularity > 50) score += 1;

      // Small random jitter for variety
      score += Math.random() * 0.5;

      return { painting, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const recommended = scored.slice(0, 8).map(s => s.painting);
    const aiCurated = scored.slice(8, 14).map(s => s.painting);

    return res.json({
      recentlyViewed,
      favoriteCategories,
      recommended,
      aiCurated
    });
  } catch (err) {
    console.error('Error compiling dashboard data:', err);
    return res.status(500).json({ error: 'Server error retrieving dashboard data' });
  }
});

export default router;
