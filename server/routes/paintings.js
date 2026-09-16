import express from 'express';
import Painting from '../models/Painting.js';
import User from '../models/User.js';
import { generateCuratorSummary } from '../utils/openai.js';
import { buildPaintingPDF } from '../utils/pdfExport.js';
import { buildPaintingDocx } from '../utils/docxExport.js';
import { findPaintingByAnyId, findSimilarPaintings } from '../utils/catalogSync.js';
import { fetchArtInstituteArtworks, hydrateArtInstituteThumbnails } from '../utils/artInstituteCatalog.js';
import { fetchMetMuseumArtworks } from '../utils/metMuseumCatalog.js';
import { fetchEuropeanaArtworks } from '../utils/europeanaCatalog.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Hosts allowed through the image proxy and downloader
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
  // Europeana and partner museum CDNs
  'iiif.europeana.eu',
  'europeana-images.s3.amazonaws.com',
  'api.europeana.eu',
  'iiif.harvardartmuseums.org',
  'media.nga.gov',
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

async function refreshCatalog(query) {
  const cacheKey = String(query || 'painting').trim().toLowerCase();
  const refreshedAt = catalogRefreshes.get(cacheKey) || 0;
  // Cache remote search pages for ten minutes. MongoDB remains the durable,
  // shared catalogue used by details, favorites, dashboards, and AI features.
  if (Date.now() - refreshedAt < 10 * 60 * 1000) return;

  // Fetch from all three sources concurrently; individual failures are non-fatal.
  const [aicArtworks, metArtworks, europeanaArtworks] = await Promise.allSettled([
    fetchArtInstituteArtworks({ query: cacheKey, limit: 100 }),
    fetchMetMuseumArtworks({ query: cacheKey, limit: 50 }),
    fetchEuropeanaArtworks({ query: cacheKey, limit: 50 }),
  ]);

  const allArtworks = [
    ...(aicArtworks.status === 'fulfilled' ? aicArtworks.value : []),
    ...(metArtworks.status === 'fulfilled' ? metArtworks.value : []),
    ...(europeanaArtworks.status === 'fulfilled' ? europeanaArtworks.value : []),
  ];

  if (metArtworks.status === 'rejected') console.warn('[Catalog] Met Museum refresh failed:', metArtworks.reason?.message);
  if (europeanaArtworks.status === 'rejected') console.warn('[Catalog] Europeana refresh failed:', europeanaArtworks.reason?.message);

  await Promise.all(allArtworks.map(async (artwork) => {
    await Painting.findOneAndUpdate(
      { catalogId: artwork.catalogId },
      { $set: { ...artwork, lastSyncedAt: new Date() }, $setOnInsert: { popularity: 0, viewsCount: 0 } },
      { upsert: true, new: true, runValidators: true }
    );
  }));
  catalogRefreshes.set(cacheKey, Date.now());
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/paintings/proxy-image?url=<image-url>
 *
 * Server-side image proxy. artic.edu (and some other museum CDNs) block
 * direct browser requests with 403 Forbidden. This endpoint fetches the
 * image server-to-server (with the Referer the host expects) and streams
 * it back with 7-day browser cache headers so each image is only fetched once.
 */
router.get('/proxy-image', async (req, res) => {
  let imageUrl;
  try {
    imageUrl = new URL(req.query.url);
  } catch {
    return res.status(400).json({ error: 'Invalid image URL' });
  }

  if (imageUrl.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(imageUrl.hostname)) {
    return res.status(400).json({ error: 'Image host not allowed' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const imageResponse = await fetch(imageUrl.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/avif,image/jpeg,image/*,*/*',
        // Must match the image host â€” artic.edu requires this, otherwise 403
        'Referer': `${imageUrl.protocol}//${imageUrl.hostname}/`
      }
    });
    clearTimeout(timeout);

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({ error: 'Could not fetch image from source' });
    }

    const contentType = imageResponse.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({ error: 'Source did not return an image' });
    }

    // Cache 7 days in the browser so paintings don't re-fetch on every load
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.setHeader('Content-Type', contentType);
    // Required when the page has Cross-Origin-Embedder-Policy: require-corp.
    // Without this, browsers block proxied images with ERR_BLOCKED_BY_RESPONSE.NotSameOrigin.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Buffer before sending. Some Node/Render combinations terminate the
    // Web-Streams `pipeTo` response early, causing the browser to receive a
    // broken image. Artwork is requested at a bounded display size, so this
    // remains small while producing a normal, complete HTTP image response.
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    res.setHeader('Content-Length', imageBuffer.length);
    return res.send(imageBuffer);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Image fetch timed out' });
    }
    console.error('[ImageProxy]', err.message);
    return res.status(500).json({ error: 'Image proxy error' });
  }
});

/**
 * GET /api/paintings/download?url=<catalog-image-url>&name=<artwork-title>
 * Streams an allowlisted catalog image with Content-Disposition: attachment.
 */
router.get('/download', async (req, res) => {
  try {
    const imageUrl = new URL(req.query.url);
    if (imageUrl.protocol !== 'https:' || !DOWNLOADABLE_IMAGE_HOSTS.has(imageUrl.hostname)) {
      return res.status(400).json({ error: 'This image source cannot be downloaded.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const imageResponse = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!imageResponse.ok) {
      return res.status(502).json({ error: 'The image source could not be reached.' });
    }

    const contentType = imageResponse.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({ error: 'The source did not return an image.' });
    }

    const requestedName = String(req.query.name || 'artwork')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'artwork';
    const extension = IMAGE_EXTENSIONS[contentType] || 'jpg';
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${requestedName}.${extension}"`);
    res.setHeader('Content-Length', imageBuffer.length);
    return res.send(imageBuffer);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'The image download timed out.' });
    }
    console.error('Error downloading artwork image:', err);
    return res.status(400).json({ error: 'Invalid image download request.' });
  }
});

/**
 * GET /api/paintings
 * Supports optional category, surface, colorMedium, style, minPopularity, and search filters.
 */
router.get('/', async (req, res) => {
  try {
    const { category, paintingType, style, surface, colorMedium, minPopularity, search } = req.query;
    const filter = {};
    const selectedCategory = paintingType && paintingType !== 'All Types'
      ? paintingType
      : category;

    if (selectedCategory && selectedCategory !== 'All') {
      filter.category = selectedCategory;
    }
    if (style && style !== 'All Styles') {
      filter.style = style;
    }
    if (surface && surface !== 'All Surfaces') {
      filter.surface = surface;
    }
    if (colorMedium && colorMedium !== 'All Mediums' && colorMedium !== 'All Color Media') {
      filter.colorMedium = colorMedium;
    }
    const popularity = Number.parseInt(minPopularity, 10);
    if (Number.isFinite(popularity) && popularity >= 0) {
      filter.popularity = { $gte: popularity };
    }
    if (search && search.trim()) {
      const normalizedSearch = search.trim();
      if (normalizedSearch.length > 100) {
        return res.status(400).json({ error: 'Search must be 100 characters or fewer' });
      }
      const regex = new RegExp(escapeRegExp(normalizedSearch), 'i');
      filter.$or = [
        { title: regex }, { artist: regex }, { description: regex }, { tags: regex },
        { style: regex }, { medium: regex }, { category: regex }, { classification: regex }
      ];
    }

    // The Art Institute is the source of new works.  A source query is fetched
    // on demand then normalized and upserted into the existing Painting model.
    // If it is temporarily unavailable, the persisted catalogue still works.
    const sourceQuery = search?.trim() || style?.trim() || selectedCategory || 'painting';
    try {
      await refreshCatalog(sourceQuery);
    } catch (sourceError) {
      console.warn('[Catalog] Art Institute refresh skipped:', sourceError.message);
    }

    const paintings = await Painting.find(filter).sort({ popularity: -1, createdAt: -1 });
    await hydrateArtInstituteThumbnails(paintings);
    return res.json(paintings);
  } catch (err) {
    console.error('Error fetching paintings:', err);
    return res.status(500).json({ error: 'Server error fetching gallery paintings' });
  }
});

/**
 * GET /api/paintings/filters
 * Filter values are derived from the synced art catalogue rather than a
 * frontend-maintained list, so newly imported metadata appears automatically.
 */
router.get('/filters', async (req, res) => {
  try {
    try {
      await refreshCatalog('painting');
    } catch (sourceError) {
      console.warn('[Catalog] Filter refresh skipped:', sourceError.message);
    }
    const [categories, styles, media, surfaces] = await Promise.all([
      Painting.distinct('category'), Painting.distinct('style'),
      Painting.distinct('colorMedium'), Painting.distinct('surface')
    ]);
    const cleanSort = (values) => values.filter(Boolean).sort((a, b) => a.localeCompare(b));
    return res.json({
      categories: cleanSort(categories), styles: cleanSort(styles),
      colorMediums: cleanSort(media), surfaces: cleanSort(surfaces)
    });
  } catch (err) {
    console.error('Error fetching painting filters:', err);
    return res.status(500).json({ error: 'Server error fetching gallery filters' });
  }
});

/**
 * GET /api/paintings/:id
 * Returns painting details + 4-6 similar paintings.
 * Accepts Mongo IDs and home-gallery catalog IDs.
 */
router.get('/:id', async (req, res) => {
  try {
    const painting = await findPaintingByAnyId(req.params.id);
    if (!painting) {
      return res.status(404).json({ error: 'Painting not found' });
    }

    painting.popularity += 1;
    painting.viewsCount += 1;
    await painting.save();

    const similarPaintings = await findSimilarPaintings(painting, 6);
    await hydrateArtInstituteThumbnails([painting, ...similarPaintings]);

    return res.json({
      painting,
      similarPaintings
    });
  } catch (err) {
    console.error('Error fetching painting details:', err);
    return res.status(500).json({ error: 'Error retrieving artwork details' });
  }
});

/**
 * POST /api/paintings/:id/view
 * Records a view for Mongo or catalog artwork IDs.
 */
router.post('/:id/view', optionalAuth, async (req, res) => {
  try {
    const painting = await findPaintingByAnyId(req.params.id);
    if (!painting) {
      return res.status(404).json({ error: 'Painting not found' });
    }

    if (req.user) {
      const user = await User.findById(req.user._id);
      if (user) {
        user.viewHistory.unshift({
          painting: painting._id,
          viewedAt: new Date()
        });
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
    return res.status(500).json({ error: 'Error logging view' });
  }
});

/**
 * POST /api/paintings/:id/summary
 * Calls Gemini once per painting, caches summary on document
 */
router.post('/:id/summary', async (req, res) => {
  try {
    const painting = await findPaintingByAnyId(req.params.id);
    if (!painting) {
      return res.status(404).json({ error: 'Painting not found' });
    }

    // Return cached summary if already generated
    if (painting.aiSummary) {
      return res.json({ summary: painting.aiSummary, cached: true });
    }

    const summary = await generateCuratorSummary(painting);
    painting.aiSummary = summary;
    await painting.save();

    return res.json({ summary, cached: false });
  } catch (err) {
    console.error('Error generating AI summary:', err);
    return res.status(500).json({ error: 'Failed to generate curator summary' });
  }
});

/**
 * GET /api/paintings/:id/export/pdf
 */
router.get('/:id/export/pdf', async (req, res) => {
  try {
    const painting = await findPaintingByAnyId(req.params.id);
    if (!painting) return res.status(404).send('Painting not found');

    if (!painting.aiSummary) {
      painting.aiSummary = await generateCuratorSummary(painting);
      await painting.save();
    }

    const pdfBuffer = buildPaintingPDF(painting);
    const filename = `${painting.title.replace(/[^a-zA-Z0-9]/g, '_')}_curator_sheet.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('Error exporting PDF:', err);
    return res.status(500).send('Error generating PDF export');
  }
});

/**
 * GET /api/paintings/:id/export/docx
 */
router.get('/:id/export/docx', async (req, res) => {
  try {
    const painting = await findPaintingByAnyId(req.params.id);
    if (!painting) return res.status(404).send('Painting not found');

    if (!painting.aiSummary) {
      painting.aiSummary = await generateCuratorSummary(painting);
      await painting.save();
    }

    const docxBuffer = await buildPaintingDocx(painting);
    const filename = `${painting.title.replace(/[^a-zA-Z0-9]/g, '_')}_curator_sheet.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(docxBuffer);
  } catch (err) {
    console.error('Error exporting DOCX:', err);
    return res.status(500).send('Error generating DOCX export');
  }
});

export default router;

