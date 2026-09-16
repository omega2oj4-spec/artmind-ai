import express from 'express';
import Painting from '../models/Painting.js';
import {
  findCatalogMatches,
  findPortalDestination,
  streamChatReply
} from '../utils/openai.js';
import { optionalAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { getHomeGalleryArtworks } from '../../src/data/homeArtworks.js';

const router = express.Router();

const CATALOG_TTL_MS = 60_000;
const catalogCache = {
  expiresAt: 0,
  usingBuiltIn: true,
  items: []
};

function serializePainting(painting) {
  const id = String(painting._id || painting.id);
  return {
    _id: id,
    id,
    title: painting.title,
    artist: painting.artist,
    category: painting.category,
    style: painting.style,
    medium: painting.medium,
    colorMedium: painting.colorMedium,
    colorTheme: painting.colorTheme,
    surface: painting.surface,
    tags: painting.tags || [],
    imageUrl: painting.imageUrl || painting.src,
    src: painting.src || painting.imageUrl,
    popularity: painting.popularity,
    viewsCount: painting.viewsCount || 0,
    isHomeArtwork: painting.isHomeArtwork || false
  };
}

function mapBuiltInCatalog() {
  return getHomeGalleryArtworks().map(artwork => ({
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
  }));
}

async function getCatalog() {
  if (Date.now() < catalogCache.expiresAt && catalogCache.items.length) {
    return catalogCache;
  }

  const databaseCatalog = await Painting.find()
    .select(
      '_id title artist category style medium colorMedium colorTheme surface tags description popularity viewsCount imageUrl'
    )
    .sort({
      popularity: -1,
      viewsCount: -1
    })
    .limit(200)
    .lean();

  const usingBuiltIn = databaseCatalog.length === 0;
  catalogCache.items = usingBuiltIn ? mapBuiltInCatalog() : databaseCatalog;
  catalogCache.usingBuiltIn = usingBuiltIn;
  catalogCache.expiresAt = Date.now() + CATALOG_TTL_MS;
  return catalogCache;
}

function writeSse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/**
 * POST /api/chat
 * Streams a fast art-assistant reply. Matching catalog cards are sent first.
 */
router.post('/', createRateLimiter({ windowMs: 60 * 1000, max: 20 }), optionalAuth, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || !message.trim() || message.length > 2000) {
      return res.status(400).json({
        error: 'Message content is required'
      });
    }

    const catalog = await getCatalog();
    const navigation = findPortalDestination(message);
    const recommendedPaintings = navigation
      ? []
      : findCatalogMatches(message, catalog.items, 4).map(serializePainting);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    writeSse(res, {
      type: 'meta',
      paintings: recommendedPaintings,
      navigation
    });

    const abortController = new AbortController();
    req.on('close', () => abortController.abort());

    await streamChatReply({
      message,
      history: history || [],
      catalogMatches: recommendedPaintings,
      signal: abortController.signal,
      onDelta: (text) => {
        if (!res.writableEnded) {
          writeSse(res, { type: 'delta', text });
        }
      }
    });

    if (!res.writableEnded) {
      writeSse(res, { type: 'done' });
      res.end();
    }
  } catch (err) {
    console.error('Error in chat bot endpoint:', err);

    if (res.headersSent) {
      writeSse(res, {
        type: 'delta',
        text: 'I am experiencing a momentary connection pause. Please try asking again!'
      });
      writeSse(res, { type: 'done' });
      return res.end();
    }

    return res.status(500).json({
      error: 'Server error in AI Chatbot'
    });
  }
});

export default router;
