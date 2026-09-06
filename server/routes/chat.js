import express from 'express';
import Painting from '../models/Painting.js';
import { chatWithArtCatalog } from '../utils/gemini.js';
import { optionalAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import { getHomeGalleryArtworks } from '../../src/data/homeArtworks.js';

const router = express.Router();

/**
 * POST /api/chat
 * AI Chatbot bounded to gallery catalog context
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Include the information needed to match natural-language requests against the catalog.
    const databaseCatalog = await Painting.find()
      .select('_id title artist category style medium colorMedium colorTheme surface tags description popularity viewsCount')
      .sort({ popularity: -1, viewsCount: -1 })
      .limit(200);
    const usingBuiltInCatalog = databaseCatalog.length === 0;
    const catalogContext = usingBuiltInCatalog
      ? getHomeGalleryArtworks().map(artwork => ({
          ...artwork,
          _id: artwork.id,
          medium: artwork.colorMedium,
          colorTheme: (artwork.tags || []).filter(tag => ['blue', 'red', 'yellow', 'green', 'purple', 'orange', 'pink', 'gold', 'black', 'white', 'brown', 'warm', 'cool', 'dark', 'light', 'neutral', 'earth'].includes(String(tag).toLowerCase())).join(' '),
          viewsCount: 0
        }))
      : databaseCatalog;

    let userProfile = null;
    if (req.user) {
      const user = await User.findById(req.user._id)
        .populate('favorites', 'category style medium colorMedium colorTheme tags')
        .populate('viewHistory.painting', 'category style medium colorMedium colorTheme tags');

      userProfile = {
        favorites: user?.favorites || [],
        recentlyViewed: (user?.viewHistory || []).map(entry => entry.painting).filter(Boolean)
      };
    }

    const botResponse = await chatWithArtCatalog(message, history || [], catalogContext, userProfile);

    // Fetch full painting documents for any recommended painting IDs
    let recommendedPaintings = [];
    if (usingBuiltInCatalog) {
      const byId = new Map(catalogContext.map(painting => [painting._id.toString(), painting]));
      recommendedPaintings = (botResponse.paintingIds || []).map(id => byId.get(id)).filter(Boolean);
    } else if (botResponse.paintingIds && botResponse.paintingIds.length > 0) {
      recommendedPaintings = await Painting.find({ _id: { $in: botResponse.paintingIds } });
    }

    return res.json({
      reply: botResponse.reply,
      paintings: recommendedPaintings
    });
  } catch (err) {
    console.error('Error in chat bot endpoint:', err);
    return res.status(500).json({ error: 'Server error in AI Chatbot' });
  }
});

export default router;
