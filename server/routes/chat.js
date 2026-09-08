import express from 'express';
import Painting from '../models/Painting.js';
import { chatWithOpenAI } from '../utils/openai.js';
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
      return res.status(400).json({
        error: 'Message content is required'
      });
    }

    // Get paintings from MongoDB
    const databaseCatalog = await Painting.find()
      .select(
        '_id title artist category style medium colorMedium colorTheme surface tags description popularity viewsCount imageUrl'
      )
      .sort({
        popularity: -1,
        viewsCount: -1
      })
      .limit(200);

    const usingBuiltInCatalog = databaseCatalog.length === 0;

    // If MongoDB is empty, use the built-in gallery
    const catalogContext = usingBuiltInCatalog
      ? getHomeGalleryArtworks().map(artwork => ({
          ...artwork,
          _id: artwork.id,
          medium: artwork.colorMedium,
          colorTheme: (artwork.tags || [])
            .filter(tag =>
              [
                'blue',
                'red',
                'yellow',
                'green',
                'purple',
                'orange',
                'pink',
                'gold',
                'black',
                'white',
                'brown',
                'warm',
                'cool',
                'dark',
                'light',
                'neutral',
                'earth'
              ].includes(String(tag).toLowerCase())
            )
            .join(' '),
          viewsCount: 0
        }))
      : databaseCatalog;

    // Get user information if logged in
    let userProfile = null;

    if (req.user) {
      const user = await User.findById(req.user._id)
        .populate(
          'favorites',
          'category style medium colorMedium colorTheme tags'
        )
        .populate(
          'viewHistory.painting',
          'category style medium colorMedium colorTheme tags'
        );

      userProfile = {
        favorites: user?.favorites || [],
        recentlyViewed: (user?.viewHistory || [])
          .map(entry => entry.painting)
          .filter(Boolean)
      };
    }

    // Ask OpenAI
    const botResponse = await chatWithOpenAI(
      message,
      history || [],
      catalogContext
    );

    console.log(
      '[Chat] OpenAI painting IDs:',
      botResponse.paintingIds
    );

    let recommendedPaintings = [];

    // ---------------------------------------------------------
    // DATABASE CATALOG
    // ---------------------------------------------------------
    if (!usingBuiltInCatalog) {
      const validIds = (botResponse.paintingIds || []).filter(id =>
        /^[0-9a-fA-F]{24}$/.test(String(id))
      );

      console.log('[Chat] Valid MongoDB IDs:', validIds);

      if (validIds.length > 0) {
        recommendedPaintings = await Painting.find({
          _id: {
            $in: validIds
          }
        });
      }
    }

    // ---------------------------------------------------------
    // BUILT-IN CATALOG
    // ---------------------------------------------------------
    else {
      const byId = new Map(
        catalogContext.map(painting => [
          String(painting._id),
          painting
        ])
      );

      recommendedPaintings = (botResponse.paintingIds || [])
        .map(id => byId.get(String(id)))
        .filter(Boolean);
    }

    console.log(
      '[Chat] Recommended paintings:',
      recommendedPaintings.length
    );

    return res.json({
      reply: botResponse.reply,
      paintings: recommendedPaintings
    });

  } catch (err) {
    console.error('Error in chat bot endpoint:', err);

    return res.status(500).json({
      error: 'Server error in AI Chatbot'
    });
  }
});

export default router;