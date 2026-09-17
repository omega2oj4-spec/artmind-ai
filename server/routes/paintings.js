import express from 'express';
import Painting from '../models/Painting.js';
import User from '../models/User.js';

import { generateCuratorSummary } from '../utils/openai.js';
import { buildPaintingPDF } from '../utils/pdfExport.js';
import { buildPaintingDocx } from '../utils/docxExport.js';

import {
  findPaintingByAnyId,
  findSimilarPaintings
} from '../utils/catalogSync.js';

import {
  fetchArtInstituteArtworks,
  hydrateArtInstituteThumbnails
} from '../utils/artInstituteCatalog.js';

import { fetchMetMuseumArtworks } from '../utils/metMuseumCatalog.js';
import { fetchEuropeanaArtworks } from '../utils/europeanaCatalog.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/* =========================================================
   ALLOWED IMAGE HOSTS
========================================================= */

const ALLOWED_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  'cdn.dribbble.com',
  'mdl.artvee.com',
  'api.nga.gov',
  'artallin.com',
  'i.pinimg.com',
  'www.artic.edu',
  'lh3.googleusercontent.com',
  'upload.wikimedia.org',
  'images.metmuseum.org',

  // Europeana
  'iiif.europeana.eu',
  'europeana-images.s3.amazonaws.com',
  'api.europeana.eu',

  // Harvard
  'iiif.harvardartmuseums.org',

  // NGA
  'media.nga.gov'
]);

const DOWNLOADABLE_IMAGE_HOSTS = ALLOWED_IMAGE_HOSTS;

const IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const catalogRefreshes = new Map();

/* =========================================================
   CATALOG REFRESH
========================================================= */

async function refreshCatalog(query) {
  const cacheKey = String(query || 'painting')
    .trim()
    .toLowerCase();

  const refreshedAt =
    catalogRefreshes.get(cacheKey) || 0;

  // Don't refresh the same search more than once every 10 minutes.
  if (Date.now() - refreshedAt < 10 * 60 * 1000) {
    return;
  }

  const [
    aicArtworks,
    metArtworks,
    europeanaArtworks
  ] = await Promise.allSettled([
    fetchArtInstituteArtworks({
      query: cacheKey,
      limit: 100
    }),

    fetchMetMuseumArtworks({
      query: cacheKey,
      limit: 50
    }),

    fetchEuropeanaArtworks({
      query: cacheKey,
      limit: 50
    })
  ]);

  const allArtworks = [
    ...(aicArtworks.status === 'fulfilled'
      ? aicArtworks.value
      : []),

    ...(metArtworks.status === 'fulfilled'
      ? metArtworks.value
      : []),

    ...(europeanaArtworks.status === 'fulfilled'
      ? europeanaArtworks.value
      : [])
  ];

  if (aicArtworks.status === 'rejected') {
    console.warn(
      '[Catalog] Art Institute refresh failed:',
      aicArtworks.reason?.message
    );
  }

  if (metArtworks.status === 'rejected') {
    console.warn(
      '[Catalog] Met Museum refresh failed:',
      metArtworks.reason?.message
    );
  }

  if (europeanaArtworks.status === 'rejected') {
    console.warn(
      '[Catalog] Europeana refresh failed:',
      europeanaArtworks.reason?.message
    );
  }

  await Promise.all(
    allArtworks.map(async (artwork) => {
      await Painting.findOneAndUpdate(
        {
          catalogId: artwork.catalogId
        },
        {
          $set: {
            ...artwork,
            lastSyncedAt: new Date()
          },

          $setOnInsert: {
            popularity: 0,
            viewsCount: 0
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );
    })
  );

  catalogRefreshes.set(
    cacheKey,
    Date.now()
  );
}

/* =========================================================
   SEARCH REGEX HELPER
========================================================= */

function escapeRegExp(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

/* =========================================================
   IMAGE PROXY
   GET /api/paintings/proxy-image?url=<image-url>
========================================================= */

router.get('/proxy-image', async (req, res) => {
  let imageUrl;

  try {
    imageUrl = new URL(
      String(req.query.url || '')
    );
  } catch {
    return res.status(400).json({
      error: 'Invalid image URL'
    });
  }

  if (
    imageUrl.protocol !== 'https:' ||
    !ALLOWED_IMAGE_HOSTS.has(
      imageUrl.hostname
    )
  ) {
    console.error(
      `[ImageProxy] Host rejected: ${imageUrl.hostname} is not in ALLOWED_IMAGE_HOSTS`
    );
    return res.status(400).json({
      error: 'Image host not allowed'
    });
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',

      'Accept':
        'image/avif,image/webp,image/apng,image/svg+xml,image/jpeg,image/png,image/*,*/*;q=0.8',

      'Accept-Language':
        'en-US,en;q=0.9'
    };

    /* -----------------------------------------------
       Art Institute of Chicago
    ------------------------------------------------ */

    if (
      imageUrl.hostname ===
      'www.artic.edu'
    ) {
      headers.Referer =
        'https://www.artic.edu/';

      headers.Origin =
        'https://www.artic.edu';
    }

    /* -----------------------------------------------
       Artvee
    ------------------------------------------------ */

    if (
      imageUrl.hostname ===
      'mdl.artvee.com'
    ) {
      headers.Referer =
        'https://artvee.com/';
    }

    /* -----------------------------------------------
       Met Museum
    ------------------------------------------------ */

    if (
      imageUrl.hostname ===
      'images.metmuseum.org'
    ) {
      headers.Referer =
        'https://www.metmuseum.org/';
    }

    /* -----------------------------------------------
       Wikimedia
    ------------------------------------------------ */

    if (
      imageUrl.hostname ===
      'upload.wikimedia.org'
    ) {
      headers.Referer =
        'https://commons.wikimedia.org/';
    }

    /* -----------------------------------------------
       Fetch image
    ------------------------------------------------ */

    const imageResponse =
      await fetch(
        imageUrl.href,
        {
          method: 'GET',
          headers,
          redirect: 'follow',
          signal: controller.signal
        }
      );

    clearTimeout(timeout);

    if (!imageResponse.ok) {
      console.error(
        `[ImageProxy] Upstream image fetch failed for host ${imageUrl.hostname}: status ${imageResponse.status} ${imageResponse.statusText}`
      );

      return res.status(502).json({
        error:
          'Image source unavailable',
        sourceStatus:
          imageResponse.status
      });
    }

    /* -----------------------------------------------
       Check content type
    ------------------------------------------------ */

    const contentType =
      imageResponse.headers
        .get('content-type')
        ?.split(';')[0]
        ?.trim()
        .toLowerCase() || '';

    if (!contentType.startsWith('image/')) {
      return res.status(502).json({
        error:
          'Source did not return an image'
      });
    }

    /* -----------------------------------------------
       Convert response to buffer
    ------------------------------------------------ */

    const imageBuffer =
      Buffer.from(
        await imageResponse.arrayBuffer()
      );

    if (!imageBuffer.length) {
      return res.status(502).json({
        error:
          'Image source returned an empty image'
      });
    }

    /* -----------------------------------------------
       Browser caching
    ------------------------------------------------ */

    res.setHeader(
      'Content-Type',
      contentType
    );

    res.setHeader(
      'Content-Length',
      imageBuffer.length
    );

    res.setHeader(
      'Cache-Control',
      'public, max-age=604800, immutable'
    );

    res.setHeader(
      'Access-Control-Allow-Origin',
      '*'
    );

    res.setHeader(
      'Cross-Origin-Resource-Policy',
      'cross-origin'
    );

    return res.send(
      imageBuffer
    );

  } catch (err) {
    clearTimeout(timeout);

    if (
      err.name === 'AbortError'
    ) {
      return res.status(504).json({
        error:
          'Image fetch timed out'
      });
    }

    console.error(
      '[ImageProxy] Error:',
      err.message
    );

    return res.status(502).json({
      error:
        'Unable to fetch image'
    });
  }
});

/* =========================================================
   DOWNLOAD IMAGE
   GET /api/paintings/download
========================================================= */

router.get(
  '/download',
  async (req, res) => {
    try {
      const imageUrl =
        new URL(
          String(
            req.query.url || ''
          )
        );

      if (
        imageUrl.protocol !==
          'https:' ||
        !DOWNLOADABLE_IMAGE_HOSTS.has(
          imageUrl.hostname
        )
      ) {
        return res.status(400).json({
          error:
            'This image source cannot be downloaded.'
        });
      }

      const controller =
        new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 15000);

      const imageResponse =
        await fetch(
          imageUrl.href,
          {
            signal:
              controller.signal,

            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',

              'Accept':
                'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
          }
        );

      clearTimeout(timeout);

      if (!imageResponse.ok) {
        return res.status(502).json({
          error:
            'The image source could not be reached.'
        });
      }

      const contentType =
        imageResponse.headers
          .get('content-type')
          ?.split(';')[0]
          ?.trim() ||
        'image/jpeg';

      if (
        !contentType.startsWith(
          'image/'
        )
      ) {
        return res.status(502).json({
          error:
            'The source did not return an image.'
        });
      }

      const requestedName =
        String(
          req.query.name ||
            'artwork'
        )
          .replace(
            /[^a-z0-9]+/gi,
            '-'
          )
          .replace(
            /^-|-$/g,
            ''
          )
          .toLowerCase() ||
        'artwork';

      const extension =
        IMAGE_EXTENSIONS[
          contentType
        ] || 'jpg';

      const imageBuffer =
        Buffer.from(
          await imageResponse.arrayBuffer()
        );

      res.setHeader(
        'Content-Type',
        contentType
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${requestedName}.${extension}"`
      );

      res.setHeader(
        'Content-Length',
        imageBuffer.length
      );

      return res.send(
        imageBuffer
      );

    } catch (err) {
      if (
        err.name ===
        'AbortError'
      ) {
        return res.status(504).json({
          error:
            'The image download timed out.'
        });
      }

      console.error(
        'Error downloading artwork image:',
        err
      );

      return res.status(400).json({
        error:
          'Invalid image download request.'
      });
    }
  }
);

/* =========================================================
   GET /api/paintings
========================================================= */

router.get(
  '/',
  async (req, res) => {
    try {
      const {
        category,
        paintingType,
        style,
        surface,
        colorMedium,
        minPopularity,
        search
      } = req.query;

      const filter = {};

      const selectedCategory =
        paintingType &&
        paintingType !==
          'All Types'
          ? paintingType
          : category;

      /* -----------------------------------------------
         Category
      ------------------------------------------------ */

      if (
        selectedCategory &&
        selectedCategory !== 'All'
      ) {
        filter.category =
          selectedCategory;
      }

      /* -----------------------------------------------
         Style
      ------------------------------------------------ */

      if (
        style &&
        style !== 'All Styles'
      ) {
        filter.style = style;
      }

      /* -----------------------------------------------
         Surface
      ------------------------------------------------ */

      if (
        surface &&
        surface !== 'All Surfaces'
      ) {
        filter.surface =
          surface;
      }

      /* -----------------------------------------------
         Medium
      ------------------------------------------------ */

      if (
        colorMedium &&
        colorMedium !==
          'All Mediums' &&
        colorMedium !==
          'All Color Media'
      ) {
        filter.colorMedium =
          colorMedium;
      }

      /* -----------------------------------------------
         Popularity
      ------------------------------------------------ */

      const popularity =
        Number.parseInt(
          minPopularity,
          10
        );

      if (
        Number.isFinite(
          popularity
        ) &&
        popularity >= 0
      ) {
        filter.popularity = {
          $gte: popularity
        };
      }

      /* -----------------------------------------------
         Search
      ------------------------------------------------ */

      if (
        search &&
        search.trim()
      ) {
        const normalizedSearch =
          search.trim();

        if (
          normalizedSearch.length >
          100
        ) {
          return res.status(400).json({
            error:
              'Search must be 100 characters or fewer'
          });
        }

        const regex =
          new RegExp(
            escapeRegExp(
              normalizedSearch
            ),
            'i'
          );

        filter.$or = [
          { title: regex },
          { artist: regex },
          {
            description:
              regex
          },
          { tags: regex },
          { style: regex },
          { medium: regex },
          {
            category:
              regex
          },
          {
            classification:
              regex
          }
        ];
      }

      /* -----------------------------------------------
         Refresh catalogue
      ------------------------------------------------ */

      const sourceQuery =
        search?.trim() ||
        style?.trim() ||
        selectedCategory ||
        'painting';

      try {
        await refreshCatalog(
          sourceQuery
        );
      } catch (
        sourceError
      ) {
        console.warn(
          '[Catalog] Art Institute refresh skipped:',
          sourceError.message
        );
      }

      /* -----------------------------------------------
         Get paintings
      ------------------------------------------------ */

      const paintings =
        await Painting.find(
          filter
        ).sort({
          popularity: -1,
          createdAt: -1
        });

      /* -----------------------------------------------
         Hydrate thumbnails
      ------------------------------------------------ */

      await hydrateArtInstituteThumbnails(
        paintings
      );

      return res.json(
        paintings
      );

    } catch (err) {
      console.error(
        'Error fetching paintings:',
        err
      );

      return res.status(500).json({
        error:
          'Server error fetching gallery paintings'
      });
    }
  }
);

/* =========================================================
   GET /api/paintings/filters
========================================================= */

router.get(
  '/filters',
  async (req, res) => {
    try {
      try {
        await refreshCatalog(
          'painting'
        );
      } catch (
        sourceError
      ) {
        console.warn(
          '[Catalog] Filter refresh skipped:',
          sourceError.message
        );
      }

      const [
        categories,
        styles,
        media,
        surfaces
      ] = await Promise.all([
        Painting.distinct(
          'category'
        ),

        Painting.distinct(
          'style'
        ),

        Painting.distinct(
          'colorMedium'
        ),

        Painting.distinct(
          'surface'
        )
      ]);

      const cleanSort =
        (values) =>
          values
            .filter(Boolean)
            .sort(
              (a, b) =>
                a.localeCompare(
                  b
                )
            );

      return res.json({
        categories:
          cleanSort(
            categories
          ),

        styles:
          cleanSort(
            styles
          ),

        colorMediums:
          cleanSort(
            media
          ),

        surfaces:
          cleanSort(
            surfaces
          )
      });

    } catch (err) {
      console.error(
        'Error fetching painting filters:',
        err
      );

      return res.status(500).json({
        error:
          'Server error fetching gallery filters'
      });
    }
  }
);

/* =========================================================
   GET /api/paintings/:id
========================================================= */

router.get(
  '/:id',
  async (req, res) => {
    try {
      const painting =
        await findPaintingByAnyId(
          req.params.id
        );

      if (!painting) {
        return res.status(404).json({
          error:
            'Painting not found'
        });
      }

      if (
        !Number.isFinite(
          painting.popularity
        )
      ) {
        painting.popularity = 0;
      }

      if (
        !Number.isFinite(
          painting.viewsCount
        )
      ) {
        painting.viewsCount = 0;
      }

      painting.popularity += 1;
      painting.viewsCount += 1;

      await painting.save();

      const similarPaintings =
        await findSimilarPaintings(
          painting,
          6
        );

      await hydrateArtInstituteThumbnails([
        painting,
        ...similarPaintings
      ]);

      return res.json({
        painting,
        similarPaintings
      });

    } catch (err) {
      console.error(
        'Error fetching painting details:',
        err
      );

      return res.status(500).json({
        error:
          'Error retrieving artwork details'
      });
    }
  }
);

/* =========================================================
   POST /api/paintings/:id/view
========================================================= */

router.post(
  '/:id/view',
  optionalAuth,
  async (req, res) => {
    try {
      const painting =
        await findPaintingByAnyId(
          req.params.id
        );

      if (!painting) {
        return res.status(404).json({
          error:
            'Painting not found'
        });
      }

      if (
        !Number.isFinite(
          painting.viewsCount
        )
      ) {
        painting.viewsCount = 0;
      }

      painting.viewsCount += 1;

      await painting.save();

      if (req.user?._id) {
        try {
          const user =
            await User.findById(
              req.user._id
            );

          if (user) {
            if (
              !Array.isArray(
                user.viewHistory
              )
            ) {
              user.viewHistory =
                [];
            }

            user.viewHistory.unshift({
              painting:
                painting._id,

              viewedAt:
                new Date()
            });

            if (
              user.viewHistory
                .length > 50
            ) {
              user.viewHistory =
                user.viewHistory.slice(
                  0,
                  50
                );
            }

            await user.save();
          }
        } catch (
          userError
        ) {
          console.warn(
            '[ViewHistory] Could not save user history:',
            userError.message
          );
        }
      }

      return res.json({
        message:
          'View recorded',

        viewsCount:
          painting.viewsCount
      });

    } catch (err) {
      console.error(
        'Error logging painting view:',
        err
      );

      return res.status(500).json({
        error:
          'Error logging view'
      });
    }
  }
);

/* =========================================================
   POST /api/paintings/:id/summary
========================================================= */

router.post(
  '/:id/summary',
  async (req, res) => {
    try {
      const painting =
        await findPaintingByAnyId(
          req.params.id
        );

      if (!painting) {
        return res.status(404).json({
          error:
            'Painting not found'
        });
      }

      // Return cached summary.
      if (painting.aiSummary) {
        return res.json({
          summary:
            painting.aiSummary,

          cached: true
        });
      }

      const summary =
        await generateCuratorSummary(
          painting
        );

      painting.aiSummary =
        summary;

      await painting.save();

      return res.json({
        summary,

        cached: false
      });

    } catch (err) {
      console.error(
        'Error generating AI summary:',
        err
      );

      return res.status(500).json({
        error:
          'Failed to generate curator summary'
      });
    }
  }
);

/* =========================================================
   GET /api/paintings/:id/export/pdf
========================================================= */

router.get(
  '/:id/export/pdf',
  async (req, res) => {
    try {
      const painting =
        await findPaintingByAnyId(
          req.params.id
        );

      if (!painting) {
        return res
          .status(404)
          .send(
            'Painting not found'
          );
      }

      if (!painting.aiSummary) {
        painting.aiSummary =
          await generateCuratorSummary(
            painting
          );

        await painting.save();
      }

      const pdfBuffer =
        buildPaintingPDF(
          painting
        );

      const filename =
        `${painting.title.replace(
          /[^a-zA-Z0-9]/g,
          '_'
        )}_curator_sheet.pdf`;

      res.setHeader(
        'Content-Type',
        'application/pdf'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      return res.send(
        Buffer.from(
          pdfBuffer
        )
      );

    } catch (err) {
      console.error(
        'Error exporting PDF:',
        err
      );

      return res
        .status(500)
        .send(
          'Error generating PDF export'
        );
    }
  }
);

/* =========================================================
   GET /api/paintings/:id/export/docx
========================================================= */

router.get(
  '/:id/export/docx',
  async (req, res) => {
    try {
      const painting =
        await findPaintingByAnyId(
          req.params.id
        );

      if (!painting) {
        return res
          .status(404)
          .send(
            'Painting not found'
          );
      }

      if (!painting.aiSummary) {
        painting.aiSummary =
          await generateCuratorSummary(
            painting
          );

        await painting.save();
      }

      const docxBuffer =
        await buildPaintingDocx(
          painting
        );

      const filename =
        `${painting.title.replace(
          /[^a-zA-Z0-9]/g,
          '_'
        )}_curator_sheet.docx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );

      return res.send(
        docxBuffer
      );

    } catch (err) {
      console.error(
        'Error exporting DOCX:',
        err
      );

      return res
        .status(500)
        .send(
          'Error generating DOCX export'
        );
    }
  }
);

export default router;