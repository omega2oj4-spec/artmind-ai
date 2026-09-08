import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Painting from '../models/Painting.js';

const router = express.Router();

/**
 * Normalize text for reliable comparisons
 */
const normalize = value =>
  String(value || '')
    .trim()
    .toLowerCase();

/**
 * Convert a string into searchable words
 */
const wordsFrom = value =>
  normalize(value)
    .split(/[\s,|/\\-]+/)
    .filter(word => word.length > 2);

/**
 * Check whether two values are similar
 */
const matches = (a, b) => {
  if (!a || !b) return false;

  const first = normalize(a);
  const second = normalize(b);

  return (
    first === second ||
    first.includes(second) ||
    second.includes(first)
  );
};

/**
 * Calculate how recent an activity is.
 *
 * Newer activity gets a larger score.
 */
const recencyWeight = date => {
  if (!date) return 0;

  const daysAgo =
    (Date.now() - new Date(date).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysAgo <= 1) return 1;
  if (daysAgo <= 3) return 0.9;
  if (daysAgo <= 7) return 0.75;
  if (daysAgo <= 14) return 0.6;
  if (daysAgo <= 30) return 0.4;

  return 0.2;
};

/**
 * POST /api/views/:paintingId
 *
 * Record a painting view.
 */
router.post('/views/:paintingId', optionalAuth, async (req, res) => {
  try {
    const painting = await Painting.findById(req.params.paintingId);

    if (!painting) {
      return res.status(404).json({
        error: 'Painting not found'
      });
    }

    painting.viewsCount = (painting.viewsCount || 0) + 1;

    await painting.save();

    if (req.user) {
      const user = await User.findById(req.user._id);

      if (user) {
        user.viewHistory.unshift({
          painting: painting._id,
          viewedAt: new Date()
        });

        // Keep the latest 50 views
        if (user.viewHistory.length > 50) {
          user.viewHistory = user.viewHistory.slice(0, 50);
        }

        await user.save();
      }
    }

    return res.json({
      message: 'View recorded',
      viewsCount: painting.viewsCount
    });
  } catch (err) {
    console.error('Error logging painting view:', err);

    return res.status(500).json({
      error: 'Error logging view'
    });
  }
});

/**
 * GET /api/dashboard
 *
 * Returns personalized dashboard data.
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    let user = null;

    if (req.user) {
      user = await User.findById(req.user._id)
        .populate('favorites')
        .populate('viewHistory.painting');
    }

    const allPaintings = await Painting.find();

    /**
     * ---------------------------------------------------------
     * 1. RECENTLY VIEWED
     * ---------------------------------------------------------
     */

    let recentlyViewed = [];

    if (user?.viewHistory?.length) {
      const seenIds = new Set();

      for (const item of user.viewHistory) {
        if (!item.painting) continue;

        const id = item.painting._id.toString();

        if (!seenIds.has(id)) {
          seenIds.add(id);
          recentlyViewed.push(item.painting);
        }

        if (recentlyViewed.length >= 10) {
          break;
        }
      }
    }

    /**
     * For new users, show some popular artworks instead.
     */
    if (recentlyViewed.length === 0) {
      recentlyViewed = await Painting.find()
        .sort({
          popularity: -1,
          viewsCount: -1
        })
        .limit(10);
    }

    /**
     * ---------------------------------------------------------
     * 2. ACTIVITY
     * ---------------------------------------------------------
     */

    const searches = user?.searchHistory || [];
    const views = user?.viewHistory || [];
    const favorites = user?.favorites || [];

    const activitySummary = {
      viewedCount: views.length,
      savedCount: favorites.length,
      searchCount: searches.length,
      latestAction: {
        label: 'Start exploring the gallery',
        at: null
      }
    };

    const latestView = views[0]?.viewedAt;

    const latestSearch =
      searches.length > 0
        ? searches[searches.length - 1]
        : null;

    const actions = [];

    if (latestView) {
      actions.push({
        type: 'view',
        date: latestView
      });
    }

    if (latestSearch?.searchedAt) {
      actions.push({
        type: 'search',
        date: latestSearch.searchedAt,
        query: latestSearch.query
      });
    }

    if (actions.length > 0) {
      actions.sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      );

      const latest = actions[0];

      activitySummary.latestAction = {
        label:
          latest.type === 'search'
            ? `Last searched for “${latest.query}”`
            : 'Last explored an artwork',
        at: latest.date
      };
    }

    /**
     * ---------------------------------------------------------
     * 3. RECENT ACTIVITY
     * ---------------------------------------------------------
     */

    const recentActivity = [
      ...views.slice(0, 8).map(item => ({
        type: 'view',
        label:
          item.painting?.title ||
          'Artwork explored',
        detail:
          item.painting?.artist
            ? `by ${item.painting.artist}`
            : 'Gallery exploration',
        at: item.viewedAt
      })),

      ...searches.slice(-8).map(item => ({
        type: 'search',
        label: 'Art search',
        detail: `“${item.query}”`,
        at: item.searchedAt
      }))
    ]
      .filter(item => item.at)
      .sort(
        (a, b) =>
          new Date(b.at) -
          new Date(a.at)
      )
      .slice(0, 8);

    /**
     * ---------------------------------------------------------
     * 4. BUILD USER PREFERENCES
     * ---------------------------------------------------------
     *
     * Favorites are stronger than views.
     * Recent activity is stronger than old activity.
     */

    const categoryScores = {};
    const styleScores = {};
    const mediumScores = {};
    const colorScores = {};
    const tagScores = {};

    /**
     * Add a score to an object.
     */
    const addScore = (object, key, amount) => {
      if (!key) return;

      const normalizedKey = String(key).trim();

      if (!normalizedKey) return;

      object[normalizedKey] =
        (object[normalizedKey] || 0) +
        amount;
    };

    /**
     * FAVORITES
     *
     * Favorite = very strong preference.
     */
    favorites.forEach(painting => {
      if (!painting) return;

      addScore(
        categoryScores,
        painting.category,
        10
      );

      addScore(
        styleScores,
        painting.style,
        8
      );

      addScore(
        mediumScores,
        painting.colorMedium ||
          painting.medium,
        6
      );

      addScore(
        colorScores,
        painting.colorTheme,
        6
      );

      (painting.tags || []).forEach(tag => {
        addScore(tagScores, tag, 3);
      });
    });

    /**
     * VIEW HISTORY
     *
     * Recent views receive more weight.
     */
    views.forEach(item => {
      const painting = item.painting;

      if (!painting) return;

      const recency =
        recencyWeight(item.viewedAt);

      const viewScore =
        5 * recency;

      addScore(
        categoryScores,
        painting.category,
        viewScore
      );

      addScore(
        styleScores,
        painting.style,
        4 * recency
      );

      addScore(
        mediumScores,
        painting.colorMedium ||
          painting.medium,
        3 * recency
      );

      addScore(
        colorScores,
        painting.colorTheme,
        3 * recency
      );

      (painting.tags || []).forEach(tag => {
        addScore(
          tagScores,
          tag,
          2 * recency
        );
      });
    });

    /**
     * SEARCH HISTORY
     *
     * Search terms are compared against painting
     * metadata.
     */
    searches.forEach(search => {
      const queryWords =
        wordsFrom(search.query);

      const recency =
        recencyWeight(search.searchedAt);

      queryWords.forEach(word => {
        /**
         * Give search terms a smaller but useful
         * preference score.
         */
        addScore(
          tagScores,
          word,
          4 * recency
        );
      });
    });

    /**
     * ---------------------------------------------------------
     * 5. USER'S PREFERRED CATEGORIES
     * ---------------------------------------------------------
     */

    const sortedCategories =
      Object.entries(categoryScores)
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category);

    const favoriteCategories =
      sortedCategories.length > 0
        ? sortedCategories.slice(0, 6)
        : [
            'Abstract',
            'Landscape',
            'Flower',
            'Nature'
          ];

    /**
     * ---------------------------------------------------------
     * 6. CATEGORY PERCENTAGES
     * ---------------------------------------------------------
     *
     * These are now calculated from actual activity.
     */

    const categoryTotals = {};

    Object.entries(categoryScores).forEach(
      ([category, score]) => {
        categoryTotals[category] =
          Math.max(0, score);
      }
    );

    const totalCategoryScore =
      Object.values(categoryTotals).reduce(
        (sum, value) => sum + value,
        0
      );

    const categoryShares =
      totalCategoryScore > 0
        ? Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([category, score]) => ({
              category,
              percentage: Math.round(
                (score /
                  totalCategoryScore) *
                  100
              )
            }))
        : [];

    /**
     * ---------------------------------------------------------
     * 7. BUILD SEARCH WORDS
     * ---------------------------------------------------------
     */

    const searchWords = [];

    searches.forEach(search => {
      wordsFrom(search.query).forEach(word => {
        if (!searchWords.includes(word)) {
          searchWords.push(word);
        }
      });
    });

    /**
     * ---------------------------------------------------------
     * 8. EXCLUDE ALREADY SEEN/SAVED ARTWORK
     * ---------------------------------------------------------
     */

    const excludedIds = new Set();

    favorites.forEach(painting => {
      if (painting?._id) {
        excludedIds.add(
          painting._id.toString()
        );
      }
    });

    views.forEach(item => {
      if (item.painting?._id) {
        excludedIds.add(
          item.painting._id.toString()
        );
      }
    });

    /**
     * ---------------------------------------------------------
     * 9. RECOMMENDATION SCORING
     * ---------------------------------------------------------
     */

    const scored = allPaintings
      .filter(
        painting =>
          !excludedIds.has(
            painting._id.toString()
          )
      )
      .map(painting => {
        let score = 0;

        /**
         * CATEGORY
         */
        const categoryScore =
          categoryScores[
            painting.category
          ] || 0;

        score += categoryScore * 1.5;

        /**
         * STYLE
         */
        const styleScore =
          styleScores[
            painting.style
          ] || 0;

        score += styleScore * 1.3;

        /**
         * MEDIUM
         */
        const mediumKey =
          painting.colorMedium ||
          painting.medium;

        const mediumScore =
          mediumScores[mediumKey] || 0;

        score += mediumScore * 1.0;

        /**
         * COLOR THEME
         */
        const colorScore =
          colorScores[
            painting.colorTheme
          ] || 0;

        score += colorScore * 1.0;

        /**
         * TAGS
         */
        (painting.tags || []).forEach(tag => {
          const tagScore =
            tagScores[tag] || 0;

          score += tagScore * 0.8;

          /**
           * Also compare search words with tags.
           */
          const normalizedTag =
            normalize(tag);

          if (
            searchWords.some(word =>
              normalizedTag.includes(word)
            )
          ) {
            score += 5;
          }
        });

        /**
         * SEARCH MATCHING
         *
         * Search against title, artist, category,
         * style, medium and description.
         */
        const searchableText =
          normalize(
            [
              painting.title,
              painting.artist,
              painting.category,
              painting.style,
              painting.medium,
              painting.colorMedium,
              painting.colorTheme,
              painting.description,
              ...(painting.tags || [])
            ].join(' ')
          );

        searchWords.forEach(word => {
          if (
            searchableText.includes(word)
          ) {
            score += 6;
          }
        });

        /**
         * POPULARITY
         *
         * Popularity is only a small bonus.
         * Personal preference remains more important.
         */
        if (painting.popularity > 0) {
          score += Math.min(
            painting.popularity / 100,
            2
          );
        }

        /**
         * VIEWS
         *
         * Small bonus for generally popular
         * artworks.
         */
        if (painting.viewsCount > 0) {
          score += Math.min(
            painting.viewsCount / 1000,
            1
          );
        }

        return {
          painting,
          score
        };
      });

    /**
     * Sort by personalized score.
     *
     * No random Math.random() here.
     */
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        (b.painting.popularity || 0) -
        (a.painting.popularity || 0)
      );
    });

    /**
     * ---------------------------------------------------------
     * 10. RECOMMENDED + AI CURATED
     * ---------------------------------------------------------
     */

    const recommended =
      scored
        .slice(0, 8)
        .map(item => item.painting);

    const aiCurated =
      scored
        .slice(8, 14)
        .map(item => item.painting);

    /**
     * ---------------------------------------------------------
     * 11. NEW USER FALLBACK
     * ---------------------------------------------------------
     *
     * If the user has no activity yet, give them
     * popular artworks rather than fake personalization.
     */

    if (
      !user ||
      (
        favorites.length === 0 &&
        views.length === 0 &&
        searches.length === 0
      )
    ) {
      const popularPaintings =
        await Painting.find()
          .sort({
            popularity: -1,
            viewsCount: -1
          })
          .limit(14);

      recommended.splice(
        0,
        recommended.length,
        ...popularPaintings.slice(0, 8)
      );

      aiCurated.splice(
        0,
        aiCurated.length,
        ...popularPaintings.slice(8, 14)
      );
    }

    /**
     * ---------------------------------------------------------
     * RESPONSE
     * ---------------------------------------------------------
     */

    return res.json({
      recentlyViewed,

      favoriteCategories,

      categoryShares,

      recommended,

      aiCurated,

      activitySummary,

      recentActivity
    });
  } catch (err) {
    console.error(
      'Error compiling dashboard data:',
      err
    );

    return res.status(500).json({
      error:
        'Server error retrieving dashboard data'
    });
  }
});

export default router;
