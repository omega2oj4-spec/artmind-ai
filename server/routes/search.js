import express from 'express';
import Painting from '../models/Painting.js';
import { parseNaturalLanguageSearch } from '../utils/gemini.js';

const router = express.Router();

/**
 * POST /api/search
 * Intelligent NLP search with automatic keyword fallback
 */
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      const allPaintings = await Painting.find().sort({ popularity: -1 }).limit(30);
      return res.json({ results: allPaintings, usingFallback: false, criteria: null });
    }

    const trimmedQuery = query.trim();

    // 1. Try Gemini NLP Parsing
    const parsed = await parseNaturalLanguageSearch(trimmedQuery);

    if (parsed && (parsed.styles?.length || parsed.colors?.length || parsed.medium || parsed.category || parsed.keywords?.length)) {
      const mongoQuery = { $or: [] };

      if (parsed.category) {
        mongoQuery.$or.push({ category: new RegExp(parsed.category, 'i') });
      }
      if (parsed.styles && parsed.styles.length) {
        mongoQuery.$or.push({ style: { $in: parsed.styles.map(s => new RegExp(s, 'i')) } });
      }
      if (parsed.colors && parsed.colors.length) {
        mongoQuery.$or.push({ colorTheme: { $in: parsed.colors.map(c => new RegExp(c, 'i')) } });
      }
      if (parsed.medium) {
        mongoQuery.$or.push({ medium: new RegExp(parsed.medium, 'i') });
      }
      if (parsed.surface) {
        mongoQuery.$or.push({ surface: new RegExp(parsed.surface, 'i') });
      }
      if (parsed.keywords && parsed.keywords.length) {
        const regexes = parsed.keywords.map(k => new RegExp(k, 'i'));
        mongoQuery.$or.push({ title: { $in: regexes } });
        mongoQuery.$or.push({ artist: { $in: regexes } });
        mongoQuery.$or.push({ tags: { $in: regexes } });
      }

      const results = await Painting.find(mongoQuery.$or.length > 0 ? mongoQuery : {}).sort({ popularity: -1 });

      if (results.length > 0) {
        return res.json({
          results,
          usingFallback: false,
          criteria: parsed
        });
      }
    }

    // 2. Keyword Search Fallback
    console.log('[Search] Triggering plain keyword search fallback...');
    const stopWords = ['show', 'find', 'me', 'with', 'the', 'a', 'an', 'in', 'of', 'on', 'some', 'all', 'pictures', 'images', 'art', 'artworks', 'paintings', 'painting', 'theme', 'themes', 'like'];
    const tokens = trimmedQuery.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);

    const regexes = tokens.map(t => new RegExp(t, 'i'));
    const fallbackFilter = tokens.length > 0
      ? {
          $or: [
            { title: { $in: regexes } },
            { artist: { $in: regexes } },
            { description: { $in: regexes } },
            { style: { $in: regexes } },
            { medium: { $in: regexes } },
            { category: { $in: regexes } },
            { tags: { $in: regexes } }
          ]
        }
      : {};

    const fallbackResults = await Painting.find(fallbackFilter).sort({ popularity: -1 });

    return res.json({
      results: fallbackResults,
      usingFallback: true,
      criteria: null
    });

  } catch (err) {
    console.error('Error during search:', err);
    return res.status(500).json({ error: 'Server error executing search' });
  }
});

export default router;
