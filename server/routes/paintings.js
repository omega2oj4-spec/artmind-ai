import express from 'express';
import Painting from '../models/Painting.js';
import { generateCuratorSummary } from '../utils/gemini.js';
import { buildPaintingPDF } from '../utils/pdfExport.js';
import { buildPaintingDocx } from '../utils/docxExport.js';

const router = express.Router();

/**
 * GET /api/paintings
 * Supports optional ?category= and ?search=
 */
router.get('/', async (req, res) => {
  try {
    const { category, style, search } = req.query;
    const filter = {};

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (style && style !== 'All Styles') {
      filter.style = style;
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
