import express from 'express';
import Painting from '../models/Painting.js';
import { generateCuratorSummary } from '../utils/openai.js';
import { buildPaintingPDF } from '../utils/pdfExport.js';
import { buildPaintingDocx } from '../utils/docxExport.js';

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
  'images.metmuseum.org'
]);

const IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

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
        // Must match the image host — artic.edu requires this, otherwise 403
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

    // Stream directly — avoids buffering entire image in Node memory
    imageResponse.body.pipeTo(
      new WritableStream({
        write(chunk) { res.write(chunk); },
        close() { res.end(); },
        abort(err) { res.destroy(err); }
      })
    );
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
    const { category, style, surface, colorMedium, minPopularity, search } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
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
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { artist: regex }, { description: regex }, { tags: regex }];
    }

    const paintings = await Painting.find(filter).sort({ popularity: -1, createdAt: -1 });
    return res.json(paintings);
  } catch (err) {
    console.error('Error fetching paintings:', err);
    return res.status(500).json({ error: 'Server error fetching gallery paintings' });
  }
});

/**
 * GET /api/paintings/:id
 * Returns painting details + 4-6 similar paintings
 */
router.get('/:id', async (req, res) => {
  try {
    const painting = await Painting.findById(req.params.id);
    if (!painting) {
      return res.status(404).json({ error: 'Painting not found' });
    }

    // Increment popularity & views count
    painting.popularity += 1;
    painting.viewsCount += 1;
    await painting.save();

    // Fetch 4 to 6 similar paintings (same category or style, excluding current painting)
    const similarPaintings = await Painting.find({
      _id: { $ne: painting._id },
      $or: [
        { category: painting.category },
        { style: painting.style },
        { tags: { $in: painting.tags || [] } }
      ]
    }).limit(6);

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
 * POST /api/paintings/:id/summary
 * Calls Gemini once per painting, caches summary on document
 */
router.post('/:id/summary', async (req, res) => {
  try {
    const painting = await Painting.findById(req.params.id);
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
    const painting = await Painting.findById(req.params.id);
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
    const painting = await Painting.findById(req.params.id);
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
