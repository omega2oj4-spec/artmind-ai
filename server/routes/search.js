import express from 'express';
import Painting from '../models/Painting.js';
import User from '../models/User.js';
import { optionalAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';

import {
  fetchArtInstituteArtworks,
  hydrateArtInstituteThumbnails
} from '../utils/artInstituteCatalog.js';

import {
  fetchMetMuseumArtworks
} from '../utils/metMuseumCatalog.js';

import {
  fetchEuropeanaArtworks
} from '../utils/europeanaCatalog.js';

import {
  smartSearch,
  getSearchTerms,
  rankPaintings
} from '../utils/smartSearch.js';

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Search configuration
|--------------------------------------------------------------------------
*/

const MAX_DISCOVERY_QUERIES = 4;
const RESULTS_PER_SOURCE_QUERY = 25;
const FINAL_RESULT_LIMIT = 100;


/*
|--------------------------------------------------------------------------
| Build external search queries
|--------------------------------------------------------------------------
|
| Example:
|
| "Japanese paintings of mountains in winter"
|
| becomes concepts such as:
|
| Japanese
| Japanese landscape
| mountain
| winter
| snow
| Japanese mountain
| winter landscape
|
*/

function buildDiscoveryQueries(query, parsed = null) {
  const terms = getSearchTerms(query, parsed);

  const cleanedTerms = [
    ...new Set(
      terms
        .map(term => String(term).trim())
        .filter(term => term.length >= 2)
    )
  ];

  const queries = [];

  // Original query is still useful.
  queries.push(query.trim());

  // Individual concepts.
  for (const term of cleanedTerms) {
    queries.push(term);
  }

  // Useful combinations.
  if (cleanedTerms.length >= 2) {
    for (
      let i = 0;
      i < cleanedTerms.length - 1;
      i++
    ) {
      queries.push(
        `${cleanedTerms[i]} ${cleanedTerms[i + 1]}`
      );
    }
  }

  // Specific parsed criteria.
  if (parsed?.category) {
    queries.push(parsed.category);
  }

  if (parsed?.medium) {
    queries.push(parsed.medium);
  }

  if (parsed?.surface) {
    queries.push(parsed.surface);
  }

  if (
    Array.isArray(parsed?.styles) &&
    parsed.styles.length
  ) {
    for (const style of parsed.styles) {
      queries.push(style);
    }
  }

  if (
    Array.isArray(parsed?.colors) &&
    parsed.colors.length
  ) {
    for (const color of parsed.colors) {
      queries.push(color);
    }
  }

  /*
   * Remove duplicates while preserving order.
   */
  const uniqueQueries = [
    ...new Set(
      queries
        .map(q => String(q).trim())
        .filter(Boolean)
        .map(q => q.slice(0, 100))
    )
  ];

  return uniqueQueries.slice(
    0,
    MAX_DISCOVERY_QUERIES
  );
}


/*
|--------------------------------------------------------------------------
| Search all external art catalogues
|--------------------------------------------------------------------------
*/

async function discoverExternalArtworks(
  query,
  parsed = null
) {
  const discoveryQueries =
    buildDiscoveryQueries(
      query,
      parsed
    );

  console.log(
    '[Search] Discovery queries:',
    discoveryQueries
  );

  const discovered = [];

  /*
   * Run queries sequentially by query so we don't
   * overwhelm the public APIs.
   */
  for (const searchQuery of discoveryQueries) {
    const results =
      await Promise.allSettled([
        fetchArtInstituteArtworks({
          query: searchQuery,
          limit: RESULTS_PER_SOURCE_QUERY
        }),

        fetchMetMuseumArtworks({
          query: searchQuery,
          limit: RESULTS_PER_SOURCE_QUERY
        }),

        fetchEuropeanaArtworks({
          query: searchQuery,
          limit: RESULTS_PER_SOURCE_QUERY
        })
      ]);

    const [
      aicResult,
      metResult,
      europeanaResult
    ] = results;

    if (
      aicResult.status === 'fulfilled'
    ) {
      discovered.push(
        ...aicResult.value
      );
    } else {
      console.warn(
        `[Search] AIC failed for "${searchQuery}":`,
        aicResult.reason?.message
      );
    }

    if (
      metResult.status === 'fulfilled'
    ) {
      discovered.push(
        ...metResult.value
      );
    } else {
      console.warn(
        `[Search] Met failed for "${searchQuery}":`,
        metResult.reason?.message
      );
    }

    if (
      europeanaResult.status === 'fulfilled'
    ) {
      discovered.push(
        ...europeanaResult.value
      );
    } else {
      console.warn(
        `[Search] Europeana failed for "${searchQuery}":`,
        europeanaResult.reason?.message
      );
    }
  }

  return deduplicateArtworks(
    discovered
  );
}


/*
|--------------------------------------------------------------------------
| Remove duplicate artworks
|--------------------------------------------------------------------------
*/

function deduplicateArtworks(
  artworks = []
) {
  const seen = new Map();

  for (const artwork of artworks) {
    if (!artwork) continue;

    const key =
      artwork.catalogId ||
      `${artwork.sourceName}-${artwork.title}-${artwork.artist}`;

    if (!seen.has(key)) {
      seen.set(key, artwork);
    }
  }

  return [...seen.values()];
}


/*
|--------------------------------------------------------------------------
| Save discovered artworks to MongoDB
|--------------------------------------------------------------------------
*/

async function saveDiscoveredArtworks(
  artworks = []
) {
  if (!artworks.length) {
    return;
  }

  /*
   * Limit database writes per search.
   */
  const limited =
    artworks.slice(0, 300);

  await Promise.all(
    limited.map(async artwork => {
      try {
        await Painting.findOneAndUpdate(
          {
            catalogId:
              artwork.catalogId
          },
          {
            $set: {
              ...artwork,
              lastSyncedAt:
                new Date()
            },

            $setOnInsert: {
              popularity: 0,
              viewsCount: 0
            }
          },
          {
            upsert: true,
            runValidators: true
          }
        );
      } catch (error) {
        console.warn(
          '[Search] Could not save artwork:',
          artwork.title,
          error.message
        );
      }
    })
  );
}


/*
|--------------------------------------------------------------------------
| Get artworks from MongoDB after external discovery
|--------------------------------------------------------------------------
*/

async function getRankedResults(
  query,
  parsed,
  discoveredArtworks
) {
  /*
   * Rank the freshly discovered external artworks
   * first. This means a newly discovered painting
   * doesn't need to already exist in MongoDB to be
   * returned.
   */
  const externalRanked =
    rankPaintings(
      discoveredArtworks,
      query,
      parsed,
      FINAL_RESULT_LIMIT
    );

  /*
   * Also search MongoDB because the database may
   * contain artworks that the external APIs did not
   * return for this particular search.
   */
  let databaseResults = [];

  try {
    databaseResults =
      await smartSearch({
        Painting,
        query,
        parsed,
        limit: FINAL_RESULT_LIMIT
      });
  } catch (error) {
    console.warn(
      '[Search] Database smart search failed:',
      error.message
    );
  }

  /*
   * Combine both result sets.
   */
  const combined =
    deduplicateArtworks([
      ...externalRanked,
      ...databaseResults
    ]);

  /*
   * Re-rank the combined results so that the final
   * ordering is based on the same relevance system.
   */
  const finalRanked = rankPaintings(
    combined,
    query,
    parsed,
    FINAL_RESULT_LIMIT
  );

  console.log(
    `[Search] Results breakdown for "${query}": ${externalRanked.length} from external discovery vs ${databaseResults.length} from MongoDB smartSearch (${finalRanked.length} final ranked)`
  );

  return finalRanked;
}


/*
|--------------------------------------------------------------------------
| Search endpoint
|--------------------------------------------------------------------------
*/

router.post(
  '/',
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 30
  }),
  optionalAuth,
  async (req, res) => {
    try {
      const { query } =
        req.body;

      /*
       * Empty search.
       */
      if (
        !query ||
        !String(query).trim()
      ) {
        const allPaintings =
          await Painting.find()
            .sort({
              popularity: -1
            })
            .limit(30);

        await hydrateArtInstituteThumbnails(
          allPaintings
        );

        return res.json({
          results: allPaintings,
          usingFallback: false,
          criteria: null,
          query: '',
          resultCount:
            allPaintings.length
        });
      }

      const trimmedQuery =
        String(query)
          .trim()
          .slice(0, 200);

      console.log(
        `\n[Search] ================================`
      );

      console.log(
        `[Search] User query: "${trimmedQuery}"`
      );

      /*
       * Save search history.
       */
      if (req.user) {
        try {
          await User.findByIdAndUpdate(
            req.user._id,
            {
              $push: {
                searchHistory: {
                  $each: [
                    {
                      query:
                        trimmedQuery,
                      searchedAt:
                        new Date()
                    }
                  ],
                  $slice: -25
                }
              }
            }
          );
        } catch (historyError) {
          console.warn(
            '[Search] Could not save search history:',
            historyError.message
          );
        }
      }

      /*
       * We no longer depend on OpenAI for search.
       *
       * Search parsing is optional. If it isn't
       * available, the local query-expansion system
       * still works.
       */
      let parsed = null;

      /*
       * Try to use the existing parser only if it
       * becomes available later.
       *
       * This import is intentionally dynamic so that
       * a missing OpenAI key does NOT break search.
       */
      try {
        const openAIUtils =
          await import(
            '../utils/openai.js'
          );

        if (
          typeof openAIUtils
            .parseNaturalLanguageSearch ===
          'function' &&
          process.env.OPENAI_API_KEY
        ) {
          parsed =
            await openAIUtils
              .parseNaturalLanguageSearch(
                trimmedQuery
              );
        }
      } catch (parseError) {
        console.warn(
          '[Search] Optional AI parser unavailable:',
          parseError.message
        );
      }

      /*
       * Normalize parser output.
       */
      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        parsed = {
          ...parsed,

          keywords:
            Array.isArray(
              parsed.keywords
            )
              ? parsed.keywords
              : [],

          styles:
            Array.isArray(
              parsed.styles
            )
              ? parsed.styles
              : [],

          colors:
            Array.isArray(
              parsed.colors
            )
              ? parsed.colors
              : []
        };
      }

      /*
       * ------------------------------------------------
       * STEP 1:
       * Search external museum catalogues.
       * ------------------------------------------------
       */
      let discoveredArtworks = [];

      try {
        discoveredArtworks =
          await discoverExternalArtworks(
            trimmedQuery,
            parsed
          );

        console.log(
          `[Search] Discovered ${discoveredArtworks.length} unique external artworks.`
        );
      } catch (discoveryError) {
        console.warn(
          '[Search] External discovery failed:',
          discoveryError.message
        );
      }

      /*
       * ------------------------------------------------
       * STEP 2:
       * Save newly discovered artworks.
       * ------------------------------------------------
       */
      if (
        discoveredArtworks.length
      ) {
        try {
          await saveDiscoveredArtworks(
            discoveredArtworks
          );

          console.log(
            `[Search] Saved discovered artworks to MongoDB.`
          );
        } catch (saveError) {
          console.warn(
            '[Search] Saving discoveries failed:',
            saveError.message
          );
        }
      }

      /*
       * ------------------------------------------------
       * STEP 3:
       * Rank external + database results.
       * ------------------------------------------------
       */
      let results =
        await getRankedResults(
          trimmedQuery,
          parsed,
          discoveredArtworks
        );

      /*
       * Hydrate AIC images.
       */
      if (results.length) {
        try {
          await hydrateArtInstituteThumbnails(
            results
          );
        } catch (hydrateError) {
          console.warn(
            '[Search] Image hydration failed:',
            hydrateError.message
          );
        }
      }

      /*
       * ------------------------------------------------
       * STEP 4:
       * Return results.
       * ------------------------------------------------
       */

      console.log(
        `[Search] Returning ${results.length} results.`
      );

      console.log(
        `[Search] ================================\n`
      );

      if (!results.length) {
        return res.json({
          results: [],
          usingFallback: false,
          criteria: parsed,
          query: trimmedQuery,
          resultCount: 0,
          message:
            'No closely related artworks were found. Try another description, artist, style, colour, subject, or mood.'
        });
      }

      return res.json({
        results,
        usingFallback: false,
        criteria: parsed,
        query: trimmedQuery,
        resultCount:
          results.length
      });

    } catch (error) {
      console.error(
        '[Search] Error during search:',
        error
      );

      return res.status(500).json({
        error:
          'Server error executing search'
      });
    }
  }
);

export default router;
