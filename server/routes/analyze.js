import express from 'express';
import multer from 'multer';
import Painting from '../models/Painting.js';
import { analyzeImageWithVision } from '../utils/gemini.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/analyze
 * Multipart file upload for AI Vision image recognition
 */
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an artwork image file' });
    }

    const mimeType = req.file.mimetype || 'image/jpeg';
    const imageBuffer = req.file.buffer;

    // 1. Perform vision analysis with Gemini
    const analysis = await analyzeImageWithVision(imageBuffer, mimeType);

    // 2. Query MongoDB for 5 similar catalog paintings
    const targetCategory = analysis.category || 'Abstract';
    const targetStyle = analysis.style || '';

    let similarPaintings = await Painting.find({
      $or: [
        { category: targetCategory },
        { style: new RegExp(targetStyle, 'i') }
      ]
    }).limit(5);

    if (similarPaintings.length < 5) {
      const remaining = 5 - similarPaintings.length;
      const existingIds = similarPaintings.map(p => p._id);
      const extra = await Painting.find({ _id: { $nin: existingIds } }).limit(remaining);
      similarPaintings = [...similarPaintings, ...extra];
    }

    return res.json({
      analysis,
      similarPaintings
    });
  } catch (err) {
    console.error('Error during image analysis:', err);
    return res.status(500).json({ error: 'Server error processing artwork image analysis' });
  }
});

export default router;
